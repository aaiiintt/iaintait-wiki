import { Hono } from "hono";
import { db } from "../db";
import { agentRoutes, nodes, edges } from "../db/schema";
import { sync } from "../db/sync";
import { eq, sql } from "drizzle-orm";

export const systemRoute = new Hono();

// POST /api/system/sync - Trigger Open Knowledge to SQLite sync
systemRoute.post("/sync", async (c) => {
  try {
    console.log("Admin triggered database sync...");
    await sync();
    return c.json({ success: true, message: "Open Knowledge sync completed successfully." });
  } catch (err) {
    console.error("Manual sync failed:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /api/system/tone - Fetch agent routes for the Tone Playground
systemRoute.get("/tone", async (c) => {
  const routes = await db.select().from(agentRoutes).orderBy(agentRoutes.keyphrase);
  return c.json(routes);
});

// POST /api/system/tone - Save edits to a specific tone route
systemRoute.post("/tone", async (c) => {
  const body = await c.req.json();
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.K_SERVICE;
  if (isProduction) {
    return c.json({ error: "Tone updates are read-only in production. Edit agent responses locally and deploy via Git." }, 403);
  }

  const { id, keyphrase, simulatedStepsJson, agentResponseMarkdown, targetProjectSlug } = body;

  if (!id) {
    return c.json({ error: "Missing route ID" }, 400);
  }

  try {
    await db
      .update(agentRoutes)
      .set({
        keyphrase,
        simulatedStepsJson,
        agentResponseMarkdown,
        targetProjectSlug: targetProjectSlug || null,
      })
      .where(eq(agentRoutes.id, id));

    return c.json({ success: true, message: "Agent tone updated successfully." });
  } catch (err) {
    console.error("Failed to update tone:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /api/system/diagnostics - Scan database for orphans and dead links
systemRoute.get("/diagnostics", async (c) => {
  // 1. Find orphans (nodes with no edges at all)
  const orphans = await db.select({ id: nodes.id, title: nodes.title, kind: nodes.kind }).from(nodes).where(
    sql`${nodes.id} NOT IN (SELECT source FROM edges) AND ${nodes.id} NOT IN (SELECT target FROM edges)`
  );

  // 2. Find dead links (edges pointing to non-existent nodes)
  const deadLinks = await db.select({
    edgeId: edges.id,
    source: edges.source,
    target: edges.target,
    kind: edges.kind
  }).from(edges).where(
    sql`${edges.target} NOT IN (SELECT id FROM nodes) OR ${edges.source} NOT IN (SELECT id FROM nodes)`
  );

  // 3. Count details
  const [nodeCountRes] = await db.select({ count: sql`count(*)` }).from(nodes);
  const [edgeCountRes] = await db.select({ count: sql`count(*)` }).from(edges);
  const [toneCountRes] = await db.select({ count: sql`count(*)` }).from(agentRoutes);

  const isProduction = process.env.NODE_ENV === "production" || !!process.env.K_SERVICE;

  return c.json({
    isProduction,
    stats: {
      totalNodes: nodeCountRes?.count || 0,
      totalEdges: edgeCountRes?.count || 0,
      totalTonePrompts: toneCountRes?.count || 0,
    },
    issues: {
      orphans,
      deadLinks,
    }
  });
});
