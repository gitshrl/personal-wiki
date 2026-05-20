import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getPersonalWikiRuntimePaths } from "@personal-wiki/wiki-core";
import Database from "better-sqlite3";
import { wikiMigrations } from "./schema";

export type WikiDatabase = ReturnType<typeof Database>;

export interface OpenWikiDatabaseOptions {
  path?: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  migrate?: boolean;
  verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
}

export const defaultWikiDatabasePath = getPersonalWikiRuntimePaths().databasePath;

interface MigrationRow {
  version: number;
}

export function openWikiDatabase(options: string | OpenWikiDatabaseOptions = {}): WikiDatabase {
  const config = typeof options === "string" ? { path: options } : options;
  const databasePath = config.path ?? defaultWikiDatabasePath;
  const readonly = config.readonly ?? false;

  if (!readonly && databasePath !== ":memory:") {
    mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  }

  const databaseOptions: {
    readonly: boolean;
    fileMustExist?: boolean | undefined;
    verbose?: ((message?: unknown, ...additionalArgs: unknown[]) => void) | undefined;
  } = { readonly };

  if (config.fileMustExist !== undefined) {
    databaseOptions.fileMustExist = config.fileMustExist;
  }

  if (config.verbose !== undefined) {
    databaseOptions.verbose = config.verbose;
  }

  const db = new Database(databasePath, databaseOptions);

  configureWikiDatabase(db, { useWal: !readonly && databasePath !== ":memory:" });

  if (config.migrate ?? !readonly) {
    migrateWikiDatabase(db);
  }

  return db;
}

export function configureWikiDatabase(db: WikiDatabase, options: { useWal?: boolean } = {}): void {
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  if (options.useWal) {
    db.pragma("journal_mode = WAL");
  }
}

export function migrateWikiDatabase(db: WikiDatabase, now = new Date().toISOString()): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL,
      applied_at text NOT NULL
    );
  `);

  const appliedRows = db.prepare("SELECT version FROM schema_migrations").all() as MigrationRow[];
  const appliedVersions = new Set(appliedRows.map((row) => row.version));
  const applyMigration = db.transaction((version: number, name: string, sql: string) => {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
      version,
      name,
      now
    );
  });

  for (const migration of wikiMigrations) {
    if (appliedVersions.has(migration.version)) continue;
    applyMigration(migration.version, migration.name, migration.sql);
  }
}
