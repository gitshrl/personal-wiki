export interface WikiMigration {
  version: number;
  name: string;
  sql: string;
}

export const wikiMigrations: WikiMigration[] = [
  {
    version: 1,
    name: "initial_storage_model",
    sql: `
      CREATE TABLE IF NOT EXISTS pages (
        id text PRIMARY KEY,
        kind text NOT NULL,
        title text NOT NULL,
        slug text NOT NULL UNIQUE,
        body text NOT NULL DEFAULT '',
        summary text,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
        source_url text,
        source_type text,
        trust text,
        created_by_agent_id text,
        created_at text NOT NULL,
        updated_at text NOT NULL,
        archived_at text,
        metadata_json text NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_pages_kind_status ON pages(kind, status);
      CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title);

      CREATE TABLE IF NOT EXISTS page_aliases (
        id text PRIMARY KEY,
        page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        alias text NOT NULL,
        normalized_alias text NOT NULL UNIQUE
      );

      CREATE INDEX IF NOT EXISTS idx_page_aliases_page_id ON page_aliases(page_id);

      CREATE TABLE IF NOT EXISTS links (
        id text PRIMARY KEY,
        from_page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        to_page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        origin text NOT NULL CHECK (origin IN ('wikilink', 'manual', 'proposal', 'system')),
        source_text text,
        created_by_agent_id text,
        created_at text NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_links_from_page_id ON links(from_page_id);
      CREATE INDEX IF NOT EXISTS idx_links_to_page_id ON links(to_page_id);
      CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_links_plain_edge
        ON links(from_page_id, to_page_id, origin, coalesce(source_text, ''));

      CREATE TABLE IF NOT EXISTS captures (
        id text PRIMARY KEY,
        source_type text NOT NULL,
        title text NOT NULL,
        raw_text text,
        source_url text,
        platform text,
        status text NOT NULL,
        captured_by text,
        captured_at text NOT NULL,
        metadata_json text NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_captures_status ON captures(status);
      CREATE INDEX IF NOT EXISTS idx_captures_captured_at ON captures(captured_at DESC);

      CREATE TABLE IF NOT EXISTS proposals (
        id text PRIMARY KEY,
        title text NOT NULL,
        status text NOT NULL,
        proposed_by_agent_id text NOT NULL,
        source_capture_id text REFERENCES captures(id) ON DELETE SET NULL,
        created_at text NOT NULL,
        applied_at text,
        payload_json text NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
      CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

      CREATE TABLE IF NOT EXISTS page_revisions (
        id text PRIMARY KEY,
        page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        body text NOT NULL,
        title text NOT NULL,
        changed_by text NOT NULL,
        change_reason text,
        created_at text NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_page_revisions_page_id ON page_revisions(page_id);
      CREATE INDEX IF NOT EXISTS idx_page_revisions_created_at ON page_revisions(created_at DESC);

      CREATE TABLE IF NOT EXISTS chunks (
        id text PRIMARY KEY,
        page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        content_hash text NOT NULL,
        chunk_index integer NOT NULL,
        text text NOT NULL,
        token_count integer,
        qdrant_point_id text,
        updated_at text NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_page_id ON chunks(page_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_page_chunk_index ON chunks(page_id, chunk_index);
      CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON chunks(content_hash);

      CREATE TABLE IF NOT EXISTS index_jobs (
        id text PRIMARY KEY,
        page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        reason text NOT NULL,
        status text NOT NULL,
        error text,
        created_at text NOT NULL,
        finished_at text
      );

      CREATE INDEX IF NOT EXISTS idx_index_jobs_status ON index_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_index_jobs_page_id ON index_jobs(page_id);

      CREATE TABLE IF NOT EXISTS agent_sessions (
        id text PRIMARY KEY,
        agent_id text NOT NULL,
        client_name text,
        started_at text NOT NULL,
        ended_at text,
        summary text
      );

      CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON agent_sessions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_started_at ON agent_sessions(started_at DESC);

      CREATE TABLE IF NOT EXISTS mcp_audit_log (
        id text PRIMARY KEY,
        session_id text REFERENCES agent_sessions(id) ON DELETE SET NULL,
        tool_name text NOT NULL,
        arguments_json text NOT NULL,
        result_summary text,
        created_at text NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_session_id ON mcp_audit_log(session_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_created_at ON mcp_audit_log(created_at DESC);

      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        title,
        summary,
        body,
        content='pages',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
        INSERT INTO pages_fts(rowid, title, summary, body)
        VALUES (new.rowid, new.title, coalesce(new.summary, ''), new.body);
      END;

      CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title, summary, body)
        VALUES ('delete', old.rowid, old.title, coalesce(old.summary, ''), old.body);
      END;

      CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE OF title, summary, body ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title, summary, body)
        VALUES ('delete', old.rowid, old.title, coalesce(old.summary, ''), old.body);
        INSERT INTO pages_fts(rowid, title, summary, body)
        VALUES (new.rowid, new.title, coalesce(new.summary, ''), new.body);
      END;
    `
  },
  {
    version: 2,
    name: "dynamic_page_kinds",
    sql: `
      DROP TRIGGER IF EXISTS pages_ai;
      DROP TRIGGER IF EXISTS pages_ad;
      DROP TRIGGER IF EXISTS pages_au;
      DROP TABLE IF EXISTS pages_fts;

      CREATE TABLE IF NOT EXISTS pages_new (
        id text PRIMARY KEY,
        kind text NOT NULL,
        title text NOT NULL,
        slug text NOT NULL UNIQUE,
        body text NOT NULL DEFAULT '',
        summary text,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
        source_url text,
        source_type text,
        trust text,
        created_by_agent_id text,
        created_at text NOT NULL,
        updated_at text NOT NULL,
        archived_at text,
        metadata_json text NOT NULL DEFAULT '{}'
      );

      INSERT INTO pages_new (
        id,
        kind,
        title,
        slug,
        body,
        summary,
        status,
        source_url,
        source_type,
        trust,
        created_by_agent_id,
        created_at,
        updated_at,
        archived_at,
        metadata_json
      )
      SELECT
        id,
        kind,
        title,
        slug,
        body,
        summary,
        status,
        source_url,
        source_type,
        trust,
        created_by_agent_id,
        created_at,
        updated_at,
        archived_at,
        metadata_json
      FROM pages;

      DROP TABLE pages;
      ALTER TABLE pages_new RENAME TO pages;

      CREATE INDEX IF NOT EXISTS idx_pages_kind_status ON pages(kind, status);
      CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title);

      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        title,
        summary,
        body,
        content='pages',
        content_rowid='rowid'
      );

      INSERT INTO pages_fts(rowid, title, summary, body)
      SELECT rowid, title, coalesce(summary, ''), body FROM pages;

      CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
        INSERT INTO pages_fts(rowid, title, summary, body)
        VALUES (new.rowid, new.title, coalesce(new.summary, ''), new.body);
      END;

      CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title, summary, body)
        VALUES ('delete', old.rowid, old.title, coalesce(old.summary, ''), old.body);
      END;

      CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE OF title, summary, body ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title, summary, body)
        VALUES ('delete', old.rowid, old.title, coalesce(old.summary, ''), old.body);
        INSERT INTO pages_fts(rowid, title, summary, body)
        VALUES (new.rowid, new.title, coalesce(new.summary, ''), new.body);
      END;
    `
  }
];
