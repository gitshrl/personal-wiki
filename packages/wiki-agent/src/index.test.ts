import { describe, expect, it } from "vitest";
import { buildAddNoteProposal, noteInputToPage } from "./index";

describe("wiki-agent", () => {
  it("builds proposal payloads for notes", () => {
    const proposal = buildAddNoteProposal({
      title: "MCP write path",
      body: "MCP writes durable [[Personal wiki]] notes.",
      agentId: "agent-codex",
      entityKind: "workflow",
      targetPages: ["Personal wiki"]
    });

    expect(proposal.changes[0]).toMatchObject({
      op: "create_page",
      kind: "note",
      pageTitle: "MCP write path",
      metadata: { entityKind: "workflow", targetPages: ["Personal wiki"] },
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

  it("stores summary and useful metadata", () => {
    const page = noteInputToPage(
      {
        title: "Session note",
        body: "MCP writes durable notes.",
        summary: "Short durable subtitle.",
        entityKind: " project ",
        agentId: "agent-codex",
        targetPages: [" Personal wiki "],
        tags: [" mcp "]
      },
      "2026-05-20T00:00:00.000Z"
    );

    expect(page.summary).toBe("Short durable subtitle.");
    expect(page.metadata).toEqual({
      entityKind: "project",
      targetPages: ["Personal wiki"],
      tags: ["mcp"]
    });
  });

  it("rejects empty entity kinds", () => {
    expect(() =>
      noteInputToPage({
        title: "Empty entity kind",
        body: "MCP writes durable notes.",
        entityKind: " ",
        agentId: "agent-codex"
      })
    ).toThrow("entityKind cannot be empty");
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
