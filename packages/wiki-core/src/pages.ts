import { createPageId, normalizePageKind, slugify } from "./ids";
import type { CreatePageInput, WikiPage } from "./types";

export function createPage(input: CreatePageInput, now = new Date().toISOString()): WikiPage {
  const kind = normalizePageKind(input.kind);
  const slug = slugify(input.title);
  const id = createPageId(kind, input.title);
  return {
    id,
    kind,
    title: input.title.trim(),
    slug,
    body: input.body ?? "",
    summary: input.summary,
    status: "active",
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
    trust: input.trust,
    createdByAgentId: input.createdByAgentId,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata ?? {}
  };
}

export function assertPageKind(value: string): asserts value is WikiPage["kind"] {
  if (!value || normalizePageKind(value) !== value.trim()) {
    throw new Error(`Invalid page kind: ${value}`);
  }
}
