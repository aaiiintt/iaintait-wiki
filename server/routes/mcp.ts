import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "../db";
import { nodes, edges } from "../db/schema";
import { eq, like, sql } from "drizzle-orm";
import { searchArchive, getNodeDetails, getTimelineEras } from "../ai/engine";

export const mcpRoute = new Hono();

// Keep track of active SSE sessions and their push callbacks
const sessions = new Map<string, (data: string) => void>();

// Helper to translate relative media links in markdown to absolute URLs
function translateUrls(body: string, origin: string): string {
  if (!body) return "";
  return body
    .replace(/\.\.\/raw\/media\//g, `${origin}/wiki-media/`)
    .replace(/\.\.\/raw\/assets\//g, `${origin}/wiki-assets/`);
}

// 1. GET /api/mcp - Establishes the SSE stream
mcpRoute.get("/", async (c) => {
  const sessionId = Math.random().toString(36).substring(2, 15);
  const origin = new URL(c.req.url).origin;

  console.log(`MCP Client connected: SSE Session ${sessionId}`);

  return streamSSE(c, async (stream) => {
    // Register the session callback
    sessions.set(sessionId, (data: string) => {
      stream.writeSSE({
        event: "message",
        data,
      });
    });

    // Send the endpoint notification so client knows where to POST requests
    stream.writeSSE({
      event: "endpoint",
      data: `/api/mcp?session_id=${sessionId}`,
    });

    // Heartbeat to keep connection alive
    const interval = setInterval(() => {
      stream.writeSSE({ event: "ping", data: "heartbeat" });
    }, 15000);

    // Keep stream open
    stream.onAbort(() => {
      clearInterval(interval);
      sessions.delete(sessionId);
      console.log(`MCP Client disconnected: SSE Session ${sessionId}`);
    });

    // Wait indefinitely
    await new Promise(() => {});
  });
});

// List of tools matching the MCP spec
const toolsList = [
  {
    name: "searchArchive",
    description: "Search the database index for keywords, project names, clients, agencies, or people. Returns a list of matching node IDs, titles, and kinds.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search term or keyword." },
      },
      required: ["query"],
    },
  },
  {
    name: "getNodeDetails",
    description: "Retrieve the full narrative narrative body, description, client, role, year, and connected relations for a specific node ID (e.g. 'project:wk_nike_better_world', 'person:chris_boyle', 'agency:poke_london', or 'industry:mcp'). Use this when the user asks about a specific project, agency, person, or industry log/guide.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique node ID." },
      },
      required: ["id"],
    },
  },
  {
    name: "getTimelineEras",
    description: "Get all indexed projects, agencies, and career hops in chronological order.",
    inputSchema: { type: "object", properties: {} },
  },
];

// 2. POST /api/mcp - Receives JSON-RPC requests
mcpRoute.post("/", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: "Invalid session" }, 400);
  }

  const origin = new URL(c.req.url).origin;
  const sendToSse = sessions.get(sessionId)!;
  const request = await c.req.json();

  const { jsonrpc, id, method, params } = request;

  // Let POST return immediately with 200 OK
  c.status(200);
  c.header("Content-Type", "application/json");
  setTimeout(async () => {
    try {
      let result: any = null;
      let error: any = null;

      if (method === "initialize") {
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "iain-tait-career-mcp",
            version: "1.0.0",
          },
        };
      } else if (method === "tools/list") {
        result = { tools: toolsList };
      } else if (method === "tools/call") {
        const { name, arguments: args } = params;
        result = await executeTool(name, args, origin);
      } else {
        error = { code: -32601, message: `Method not found: ${method}` };
      }

      const response = error
        ? { jsonrpc: "2.0", id, error }
        : { jsonrpc: "2.0", id, result };

      sendToSse(JSON.stringify(response));
    } catch (e) {
      console.error("Error processing MCP call:", e);
      sendToSse(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          error: { code: -32603, message: String(e) },
        })
      );
    }
  }, 0);

  return c.body(null);
});

// Tool executor logic
async function executeTool(name: string, args: any, origin: string) {
  if (name === "searchArchive") {
    const matched = await searchArchive(args.query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(matched, null, 2),
        },
      ],
    };
  }

  if (name === "getNodeDetails") {
    const details = await getNodeDetails(args.id);
    if (details.body) {
      details.body = translateUrls(details.body, origin);
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(details, null, 2),
        },
      ],
    };
  }

  if (name === "getTimelineEras") {
    const list = await getTimelineEras();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(list, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
