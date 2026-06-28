import { Hono } from "hono";
import { db } from "../db";
import { nodes, edges } from "../db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { translateMediaUrls } from "../utils/media";

export const nodesRoute = new Hono();

// GET /api/nodes/:id - Fetch detailed node content
nodesRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [node] = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);

  if (!node) {
    return c.json({ error: "Node not found" }, 404);
  }

  // 1. Translate local markdown paths for image/video tags
  const translatedBody = translateMediaUrls(node.body || "");

  // 2. Fetch connected nodes for chips
  const adjacent = await db
    .select({
      id: edges.id,
      source: edges.source,
      target: edges.target,
      kind: edges.kind,
    })
    .from(edges)
    .where(sql`${edges.source} = ${id} OR ${edges.target} = ${id}`);

  const neighborIds = adjacent.map((e) => (e.source === id ? e.target : e.source));
  let chips: any[] = [];
  if (neighborIds.length > 0) {
    chips = await db
      .select({
        id: nodes.id,
        title: nodes.title,
        kind: nodes.kind,
        confidential: nodes.confidential,
      })
      .from(nodes)
      .where(inArray(nodes.id, neighborIds));
  }

  return c.json({
    ...node,
    body: translatedBody,
    chips,
  });
});

// GET /api/nodes - List all nodes (useful for diagnostics or dynamic indexes)
nodesRoute.get("/", async (c) => {
  const list = await db
    .select({
      id: nodes.id,
      title: nodes.title,
      kind: nodes.kind,
      year: nodes.year,
      confidential: nodes.confidential,
    })
    .from(nodes)
    .orderBy(nodes.year);

  return c.json(list);
});
