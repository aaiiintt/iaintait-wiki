import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(), // e.g. "project:poke_baker_tweet"
  kind: text("kind", { enum: ["project", "agency", "person", "industry", "about"] }).notNull(),
  title: text("title").notNull(),
  year: integer("year"),
  desc: text("desc"),
  body: text("body"), // full markdown
  richness: integer("richness").notNull().default(0),
  sourceUrls: text("source_urls").default("[]"), // JSON array
  client: text("client"),
  role: text("role"),
  slug: text("slug"),
  confidential: integer("confidential").notNull().default(0), // 0=false, 1=true
  hasProfile: integer("has_profile").notNull().default(0), // 0=false, 1=true
});

export const edges = sqliteTable("edges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  target: text("target")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["agency", "collab", "link"] }).notNull(),
});

export const agentRoutes = sqliteTable("agent_routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyphrase: text("keyphrase").unique().notNull(), // search keyword, e.g. "patent"
  simulatedStepsJson: text("simulated_steps_json").notNull(), // JSON array of logs
  agentResponseMarkdown: text("agent_response_markdown").notNull(), // witty markdown text
  targetProjectSlug: text("target_project_slug"), // optional target project slug
});

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;
export type AgentRoute = typeof agentRoutes.$inferSelect;
export type NewAgentRoute = typeof agentRoutes.$inferInsert;

export const queryCache = sqliteTable("query_cache", {
  queryText: text("query_text").primaryKey(), // lowercase, trimmed search phrase
  responseJson: text("response_json").notNull(), // JSON string payload of target response
  hitCount: integer("hit_count").notNull().default(1),
  updatedAt: integer("updated_at").notNull(), // timestamp ms
  curated: integer("curated").notNull().default(0), // 0=dynamic, 1=manually approved/frozen
  queryVectorJson: text("query_vector_json"), // JSON float array of normalized query embedding
});

export const queryLogs = sqliteTable("query_logs", {
  id: text("id").primaryKey(), // unique random id
  queryText: text("query_text").notNull(),
  responseJson: text("response_json").notNull(),
  hitCount: integer("hit_count").notNull().default(1),
  status: text("status", { enum: ["pending", "seeded", "ignored"] }).notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
});

export const nodeEmbeddings = sqliteTable("node_embeddings", {
  nodeId: text("node_id")
    .primaryKey()
    .references(() => nodes.id, { onDelete: "cascade" }),
  embeddingJson: text("embedding_json").notNull(), // JSON float array of normalized embedding
});
