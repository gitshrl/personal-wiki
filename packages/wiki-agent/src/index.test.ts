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
      kind: "note",
      pageTitle: "MCP write path",
      targetPages: ["Personal wiki"]
    });
  });

  it("turns add note input into a note page", () => {
    const page = noteInputToPage(
      {
        title: "MCP write path",
        body: "MCP writes durable notes.",
        agentId: "agent-codex"
      },
      "2026-05-20T00:00:00.000Z"
    );

    expect(page).toMatchObject({
      kind: "note",
      sourceType: "note",
      createdByAgentId: "agent-codex",
      metadata: {}
    });
  });

  it("stores source session metadata only when it is meaningful", () => {
    const page = noteInputToPage(
      {
        title: "Session note",
        body: "MCP writes durable notes.",
        summary: "Short durable subtitle.",
        agentId: "agent-codex",
        sourceSessionId: " session-2026-05-22 ",
        sourceSessionLabel: " 2026 planning session ",
        tags: [" mcp "]
      },
      "2026-05-20T00:00:00.000Z"
    );

    expect(page.summary).toBe("Short durable subtitle.");
    expect(page.metadata).toEqual({
      sourceSessionId: "session-2026-05-22",
      sourceSessionLabel: "2026 planning session",
      tags: ["mcp"]
    });
  });

  it("rejects long subtitles", () => {
    expect(() =>
      noteInputToPage({
        title: "Long subtitle",
        body: "MCP writes durable notes.",
        summary: "x".repeat(97),
        agentId: "agent-codex"
      })
    ).toThrow("summary must be 96 characters or fewer");
  });
});
