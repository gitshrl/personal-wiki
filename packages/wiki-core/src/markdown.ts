import { getBacklinkPages, getOutgoingPages } from "./graph";
import type { PageGraph, WikiPage } from "./types";

export interface RenderMarkdownOptions {
  includeLinks?: boolean;
}

export function renderPageMarkdown(
  page: WikiPage,
  graph: PageGraph,
  options: RenderMarkdownOptions = {}
): string {
  const includeLinks = options.includeLinks ?? true;
  const lines: string[] = [
    "---",
    `id: ${escapeYamlScalar(page.id)}`,
    `kind: ${escapeYamlScalar(page.kind)}`,
    `title: ${escapeYamlScalar(page.title)}`,
    `slug: ${escapeYamlScalar(page.slug)}`,
    `status: ${escapeYamlScalar(page.status)}`,
    `updated_at: ${escapeYamlScalar(page.updatedAt)}`
  ];

  if (page.summary) lines.push(`summary: ${escapeYamlScalar(page.summary)}`);
  if (page.sourceType) lines.push(`source_type: ${escapeYamlScalar(page.sourceType)}`);
  if (page.sourceUrl) lines.push(`source_url: ${escapeYamlScalar(page.sourceUrl)}`);
  if (page.createdByAgentId)
    lines.push(`created_by_agent_id: ${escapeYamlScalar(page.createdByAgentId)}`);

  lines.push("---", "", `# ${page.title}`, "");

  if (page.summary) {
    lines.push("## Summary", "", page.summary, "");
  }

  lines.push("## Body", "", page.body || "_No body yet._", "");

  if (includeLinks) {
    const backlinks = getBacklinkPages(page.id, graph);
    const outgoing = getOutgoingPages(page.id, graph);
    lines.push("## Backlinks", "");
    lines.push(...formatPageList(backlinks));
    lines.push("", "## Outgoing", "");
    lines.push(...formatPageList(outgoing));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function formatPageList(pages: WikiPage[]): string[] {
  if (pages.length === 0) return ["_None._"];
  return pages.map((page) => `- [[${page.title}]] (${page.kind})`);
}

function escapeYamlScalar(value: string): string {
  if (/^[a-zA-Z0-9_.:/@ -]+$/.test(value)) return value;
  return JSON.stringify(value);
}
