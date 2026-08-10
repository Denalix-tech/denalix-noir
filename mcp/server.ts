#!/usr/bin/env -S npx tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerBlogTools } from "./tools";

/**
 * Denalix blog MCP server — transport and wiring only.
 *
 * The tool surface lives in `tools.ts`, the site registry in `sites.ts`, and
 * Supabase access in `adapters/supabase.ts`. Keeping this file to the transport
 * means a second transport (HTTP, for a non-Claude client) would reuse the tools
 * unchanged rather than forking them.
 *
 * stdio only, deliberately. This server holds every configured site's
 * service-role key and bypasses RLS, so it must never be deployed or exposed on
 * a port. See `docs/features/MULTI_SITE_PLAN.md` D5 and D6.
 */

const server = new McpServer({ name: "denalix-blog", version: "2.0.0" });

registerBlogTools(server);

await server.connect(new StdioServerTransport());
