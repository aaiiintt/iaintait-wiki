import { Hono } from "hono";
import { db } from "../db";
import { nodes } from "../db/schema";
import { sql } from "drizzle-orm";

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

    return c.json({ results: dbResults });
  } catch (err) {
    console.error("Autocomplete failed:", err);
    return c.json({ results: [] });
  }
});
