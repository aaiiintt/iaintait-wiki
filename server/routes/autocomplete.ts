import { Hono } from "hono";
import { db } from "../db";
import { nodes, edges } from "../db/schema";
import { sql, eq, or, and, inArray } from "drizzle-orm";

export const autocompleteRoute = new Hono();

// GET /api/autocomplete?q=...
// Fast autocomplete route bypassing LLM
autocompleteRoute.get("/", async (c) => {
  const query = c.req.query("q")?.trim() || "";

  if (!query) {
    return c.json({ results: [] });
  }

  try {
    const matchTerm = `%${query}%`;
    const dbResults = await db
      .select({
        id: nodes.id,
        title: nodes.title,
        kind: nodes.kind,
        year: nodes.year,
        client: nodes.client,
      })
      .from(nodes)
      .where(
        sql`${nodes.id} NOT LIKE 'faq' AND ${nodes.id} NOT LIKE 'overview' AND ${nodes.id} NOT LIKE '%index' AND (${nodes.title} LIKE ${matchTerm} OR ${nodes.client} LIKE ${matchTerm} OR ${nodes.id} LIKE ${matchTerm})`
      )
      .limit(5);

    const allResults = dbResults.map(r => ({ ...r, relationContext: undefined as string | undefined }));
    const seenIds = new Set(allResults.map(r => r.id));

    // For any matched collaborator (person) or agency, pull linked projects from the graph
    for (const match of dbResults) {
      if (match.kind === "person" || match.kind === "agency") {
        const connections = await db
          .select({
            source: edges.source,
            target: edges.target,
          })
          .from(edges)
          .where(
            or(
              eq(edges.source, match.id),
              eq(edges.target, match.id)
            )
          )
          .limit(5);

        const relatedIds = connections.map(conn => 
          conn.source === match.id ? conn.target : conn.source
        );

        if (relatedIds.length > 0) {
          const relatedDbNodes = await db
            .select({
              id: nodes.id,
              title: nodes.title,
              kind: nodes.kind,
              year: nodes.year,
              client: nodes.client,
            })
            .from(nodes)
            .where(
              and(
                inArray(nodes.id, relatedIds),
                eq(nodes.kind, "project")
              )
            );

          for (const rNode of relatedDbNodes) {
            if (!seenIds.has(rNode.id)) {
              seenIds.add(rNode.id);
              allResults.push({
                ...rNode,
                relationContext: match.kind === "person"
                  ? `Project (with ${match.title})`
                  : `Project (${match.title} era)`
              });
            }
          }
        }
      }
    }

    return c.json({ results: allResults.slice(0, 10) });
  } catch (err) {
    console.error("Autocomplete failed:", err);
    return c.json({ results: [] });
  }
});
