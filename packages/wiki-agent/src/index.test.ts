import { describe, expect, it } from "vitest";
import { buildAddNoteProposal, noteInputToPage } from "./index";

describe("wiki-agent", () => {
  it("builds proposal payloads for notes", () => {
    const proposal = buildAddNoteProposal({
      title: "MCP write path",
      body: "MCP writes durable [[Personal wiki]] notes.",
      agentId: "agent-codex",
      targetPages: ["Personal wiki"]
    });

    expect(proposal.changes[0]).toMatchObject({
      op: "create_page",
      pageTitle: "MCP write path",
      targetPages: ["Personal wiki"]
    });
  });

  it("turns add note input into an article page", () => {
    const page = noteInputToPage(
      {
        title: "MCP write path",
        body: "MCP writes durable notes.",
        agentId: "agent-codex"
      },
      "2026-05-20T00:00:00.000Z"
    );

    expect(page).toMatchObject({
      kind: "article",
      sourceType: "note",
      createdByAgentId: "agent-codex"
    });
  });
});
