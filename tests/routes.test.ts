import { describe, it, expect, beforeAll, vi } from "vitest";
import { Hono } from "hono";
import { searchRoute } from "../server/routes/search";
import { nodesRoute } from "../server/routes/nodes";
import { mcpRoute } from "../server/routes/mcp";
import { db } from "../server/db";
import { agentRoutes, nodes } from "../server/db/schema";
import { eq } from "drizzle-orm";

vi.mock("genkit", () => {
  return {
    genkit: () => ({
      defineTool: (config: any) => config,
      generate: async ({ prompt }: { prompt: string }) => {
        const parts = prompt.split("User Query:");
        const q = (parts[parts.length - 1] || prompt).toLowerCase();
        
        if (q.includes("patent")) {
          return {
            text: "Patent details here.",
            toolRequests: [{ name: "searchArchive", input: { query: "patent" } }]
          };
        }
        if (q.includes("talks")) {
          return {
            text: "Public Speaking & Keynotes details here.",
            toolRequests: [{ name: "searchArchive", input: { query: "talks" } }]
          };
        }
        if (q.includes("hire")) {
          return {
            text: "Recruiter & Hiring Brief details here.",
            toolRequests: [{ name: "searchArchive", input: { query: "hire" } }]
          };
        }
        if (q.includes("wieden")) {
          return {
            text: "Agency & Geographic Hops details here.",
            toolRequests: [{ name: "searchArchive", input: { query: "wieden" } }]
          };
        }
        if (q.includes("collaborator") || q.includes("worked with")) {
          return {
            text: "Key Collaborators & Co-founders details here.",
            toolRequests: [{ name: "searchArchive", input: { query: "collaborators" } }]
          };
        }
        return {
          text: "Mocked general agent response.",
          toolRequests: []
        };
      }
    }),
    z: require("zod").z
  };
});

describe("Hono API Endpoints", () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route("/api/search", searchRoute);
    app.route("/api/nodes", nodesRoute);
    app.route("/api/mcp", mcpRoute);
  });

  it("GET /api/nodes should return full list of indexed nodes", async () => {
    const res = await app.request("/api/nodes");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("title");
  });

  it("GET /api/nodes/:id should return details of a specific node", async () => {
    const res = await app.request("/api/nodes/person:iain_tait");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("person:iain_tait");
    expect(data.title).toBe("Iain Tait");
    expect(data).toHaveProperty("body");
    expect(Array.isArray(data.chips)).toBe(true);
  });

  it("GET /api/search?q=patent should return agent intent override", async () => {
    const res = await app.request("/api/search?q=patent");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("agent");
    expect(data.terminalLogs).toHaveProperty("actions");
    expect(data.agentResponse).toContain("Patent");
  });

  it("GET /api/search?q=nonexistent_search_query should return fuzzy fallback with NDA warning copy", async () => {
    const res = await app.request("/api/search?q=nonexistent_search_query");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("fallback");
    expect(data.agentResponse).toContain("dead ends");
    expect(data.wikiResults.length).toBe(0);
  });

  it("GET /api/mcp should establish SSE session and return endpoint info", async () => {
    const res = await app.request("/api/mcp");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    // Read first event chunk
    const reader = res.body?.getReader();
    const chunk = await reader?.read();
    const text = new TextDecoder().decode(chunk?.value);

    expect(text).toContain("event: endpoint");
    expect(text).toContain("data: /api/mcp?session_id=");
    
    // Clean up reader
    reader?.cancel();
  });

  it("GET /api/search?q=nike should return Nike projects", async () => {
    const res = await app.request("/api/search?q=nike");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.wikiResults[0].id).toBe("project:wk_nike_better_world");
    expect(data.wikiResults[1].id).toBe("project:wk_nothing_beats_a_londoner");
  });

  it("GET /api/search?q=chris+boyle should return Chris Boyle profile first", async () => {
    const res = await app.request("/api/search?q=chris boyle");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.wikiResults[0].id).toBe("person:chris_boyle");
  });

  it("GET /api/search?q=talks should return talks agent route intent", async () => {
    const res = await app.request("/api/search?q=talks");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("agent");
    expect(data.agentResponse).toContain("Public Speaking & Keynotes");
    expect(data.targetProjectSlug).toBe("podcasts_and_speaking");
  });

  it("GET /api/search?q=hire should return recruiter hiring override", async () => {
    const res = await app.request("/api/search?q=hire");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("agent");
    expect(data.agentResponse).toContain("Recruiter & Hiring Brief");
  });

  it("GET /api/search?q=wieden should return agency hops override", async () => {
    const res = await app.request("/api/search?q=wieden");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("agent");
    expect(data.agentResponse).toContain("Agency & Geographic Hops");
  });

  it("GET /api/search?q=collaborators should return syndicate override", async () => {
    const res = await app.request("/api/search?q=collaborators");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("agent");
    expect(data.agentResponse).toContain("Key Collaborators & Co-founders");
  });

  it("GET /api/search?q=who+has+iain+worked+with should redirect semantically to collaborators intent", async () => {
    const res = await app.request("/api/search?q=who has iain worked with");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("agent");
    expect(data.agentResponse).toContain("Key Collaborators & Co-founders");
    expect(data.terminalLogs.actions[0].step).toBe("Semantic Intent Classifier");
    expect(data.terminalLogs.actions[0].intent).toBe("collaborators");
  });
});
