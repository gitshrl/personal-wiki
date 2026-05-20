import { serve } from "@hono/node-server";
import { createServerApp } from "./app";

const port = Number(process.env.PORT ?? 4321);
const app = createServerApp();

serve({ fetch: app.fetch, port });

console.log(`personal-wiki server listening on http://localhost:${port}`);
