import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPersonalWikiMcpServer } from "./server";

async function main() {
  const server = createPersonalWikiMcpServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("personal-wiki MCP server failed", error);
  process.exit(1);
});
