import { createPage, type PageKind } from "@personal-wiki/wiki-core";

export type WriteMode = "propose" | "direct";

export interface AddNoteInput {
  title: string;
  body: string;
  kind?: Extract<PageKind, "article" | "topic"> | undefined;
  agentId: string;
  sourceSessionId?: string | undefined;
  targetPages?: string[] | undefined;
  tags?: string[] | undefined;
  mode?: WriteMode | undefined;
}

export interface ProposalChange {
  op: "create_page" | "append_page" | "add_link";
  pageTitle?: string | undefined;
  pageId?: string | undefined;
  body?: string | undefined;
  targetPages?: string[] | undefined;
}

export interface WikiProposalPayload {
  title: string;
  proposedByAgentId: string;
  sourceSessionId?: string | undefined;
  changes: ProposalChange[];
}

export function buildAddNoteProposal(input: AddNoteInput): WikiProposalPayload {
  const normalized = normalizeAddNoteInput(input);
  return {
    title: normalized.title,
    proposedByAgentId: normalized.agentId,
    sourceSessionId: normalized.sourceSessionId,
    changes: [
      {
        op: "create_page",
        pageTitle: normalized.title,
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
      sourceType: "note",
      createdByAgentId: normalized.agentId,
      metadata: {
        sourceSessionId: normalized.sourceSessionId,
        targetPages: normalized.targetPages,
        tags: normalized.tags
      }
    },
    now
  );
}

export function normalizeAddNoteInput(input: AddNoteInput): Required<AddNoteInput> {
  const title = input.title.trim();
  const body = input.body.trim();
  const agentId = input.agentId.trim();
  if (!title) throw new Error("title is required");
  if (!body) throw new Error("body is required");
  if (!agentId) throw new Error("agentId is required");

  return {
    title,
    body,
    kind: input.kind ?? "article",
    agentId,
    sourceSessionId: input.sourceSessionId ?? "",
    targetPages: input.targetPages ?? [],
    tags: input.tags ?? [],
    mode: input.mode ?? "propose"
  };
}
