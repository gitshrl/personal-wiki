import { createPage, normalizePageKind, type PageKind } from "@personal-wiki/wiki-core";

export type WriteMode = "propose" | "direct";

export interface AddNoteInput {
  title: string;
  body: string;
  kind?: PageKind | undefined;
  summary?: string | undefined;
  agentId: string;
  targetPages?: string[] | undefined;
  tags?: string[] | undefined;
  mode?: WriteMode | undefined;
}

export interface ProposalChange {
  op: "create_page" | "append_page" | "add_link";
  kind?: PageKind | undefined;
  pageTitle?: string | undefined;
  pageId?: string | undefined;
  summary?: string | undefined;
  body?: string | undefined;
  targetPages?: string[] | undefined;
}

export interface WikiProposalPayload {
  title: string;
  proposedByAgentId: string;
  changes: ProposalChange[];
}

interface NormalizedAddNoteInput {
  title: string;
  body: string;
  kind: PageKind;
  summary?: string | undefined;
  agentId: string;
  targetPages: string[];
  tags: string[];
  mode: WriteMode;
}

export function buildAddNoteProposal(input: AddNoteInput): WikiProposalPayload {
  const normalized = normalizeAddNoteInput(input);
  return {
    title: normalized.title,
    proposedByAgentId: normalized.agentId,
    changes: [
      {
        op: "create_page",
        kind: normalized.kind,
        pageTitle: normalized.title,
        summary: normalized.summary,
        body: normalized.body,
        targetPages: normalized.targetPages
      }
    ]
  };
}

export function noteInputToPage(input: AddNoteInput, now = new Date().toISOString()) {
  const normalized = normalizeAddNoteInput(input);
  return createPage(
    {
      kind: normalized.kind,
      title: normalized.title,
      body: normalized.body,
      summary: normalized.summary,
      sourceType: "note",
      createdByAgentId: normalized.agentId,
      metadata: noteMetadata(normalized)
    },
    now
  );
}

export function normalizeAddNoteInput(input: AddNoteInput): NormalizedAddNoteInput {
  const title = input.title.trim();
  const body = input.body.trim();
  const summary = input.summary?.trim();
  const agentId = input.agentId.trim();
  if (!title) throw new Error("title is required");
  if (!body) throw new Error("body is required");
  if (summary && summary.length > 96) throw new Error("summary must be 96 characters or fewer");
  if (!agentId) throw new Error("agentId is required");

  return {
    title,
    body,
    kind: normalizePageKind(input.kind ?? "note"),
    summary: summary || undefined,
    agentId,
    targetPages: input.targetPages?.map((targetPage) => targetPage.trim()).filter(Boolean) ?? [],
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    mode: input.mode ?? "propose"
  };
}

function noteMetadata(input: NormalizedAddNoteInput): Record<string, unknown> {
  return {
    ...(input.targetPages.length > 0 ? { targetPages: input.targetPages } : {}),
    ...(input.tags.length > 0 ? { tags: input.tags } : {})
  };
}
