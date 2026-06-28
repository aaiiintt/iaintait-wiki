import { genkit, z } from 'genkit';
import { vertexAI } from '@genkit-ai/google-genai';
import { db } from '../db';
import { nodes } from '../db/schema';
import { eq, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { translateMediaUrls } from "../utils/media";

// Initialize Firebase Genkit with Vertex AI
export const ai = genkit({
  plugins: [
    vertexAI({
      projectId: "aaiiintt",
      location: "us-central1"
    })
  ]
});

// Read markdown files directly from disk in real-time (source of truth for AI details)
function readMarkdownFileDirectly(id: string): { body: string; frontmatter: any } | null {
  let relativeFolder = "";
  let slug = "";

  if (id.startsWith("project:")) {
    relativeFolder = "projects";
    slug = id.replace("project:", "");
  } else if (id.startsWith("person:")) {
    relativeFolder = "collaborators";
    slug = id.replace("person:", "");
  } else if (id.startsWith("agency:")) {
    relativeFolder = "agencies";
    slug = id.replace("agency:", "");
  } else if (id.startsWith("industry:")) {
    relativeFolder = "industry";
    slug = id.replace("industry:", "");
  } else {
    return null;
  }

  const filePath = path.join(process.cwd(), relativeFolder, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    try {
      const rawContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(rawContent);
      return {
        body: translateMediaUrls(content),
        frontmatter: data
      };
    } catch (err) {
      console.error(`Failed to read file directly at ${filePath}:`, err);
    }
  }
  return null;
}

// Core database logic functions exported for reuse
export async function searchArchive(query: string) {
  const kw = query.trim().toLowerCase();
  let condition;
  if (kw.length <= 3) {
    condition = sql`(${nodes.title} LIKE ${`% ${kw} %`} OR ${nodes.title} LIKE ${`${kw} %`} OR ${nodes.title} LIKE ${`% ${kw}`} OR ${nodes.title} = ${kw}
                  OR ${nodes.body} LIKE ${`% ${kw} %`} OR ${nodes.body} LIKE ${`${kw} %`} OR ${nodes.body} LIKE ${`% ${kw}`}
                  OR ${nodes.client} LIKE ${`% ${kw} %`} OR ${nodes.client} LIKE ${`${kw} %`} OR ${nodes.client} LIKE ${`% ${kw}`}
                  OR ${nodes.role} LIKE ${`% ${kw} %`} OR ${nodes.role} LIKE ${`${kw} %`} OR ${nodes.role} LIKE ${`% ${kw}`}
                  OR ${nodes.id} LIKE ${`% ${kw} %`} OR ${nodes.id} LIKE ${`${kw} %`} OR ${nodes.id} LIKE ${`% ${kw}`})`;
  } else {
    const matchTerm = `%${query}%`;
    condition = sql`${nodes.title} LIKE ${matchTerm} 
                OR ${nodes.body} LIKE ${matchTerm} 
                OR ${nodes.client} LIKE ${matchTerm} 
                OR ${nodes.role} LIKE ${matchTerm}
                OR ${nodes.id} LIKE ${matchTerm}`;
  }
  const results = await db
    .select({
      id: nodes.id,
      title: nodes.title,
      kind: nodes.kind,
      year: nodes.year,
      desc: nodes.desc,
      confidential: nodes.confidential
    })
    .from(nodes)
    .where(condition)
    .limit(20);
  return results;
}

export async function getNodeDetails(id: string) {
  let canonicalId = id.trim().replace(/^file:\/\/\//, "");
  canonicalId = canonicalId.replace(/^\.\.\//, "").replace(/^\.\//, "");
  
  if (canonicalId.startsWith("projects/")) {
    canonicalId = "project:" + canonicalId.replace("projects/", "").replace(".md", "");
  } else if (canonicalId.startsWith("agencies/")) {
    canonicalId = "agency:" + canonicalId.replace("agencies/", "").replace(".md", "");
  } else if (canonicalId.startsWith("collaborators/")) {
    canonicalId = "person:" + canonicalId.replace("collaborators/", "").replace(".md", "");
  } else if (canonicalId.startsWith("industry/")) {
    canonicalId = "industry:" + canonicalId.replace("industry/", "").replace(".md", "");
  }

  const [dbNode] = await db.select().from(nodes).where(eq(nodes.id, canonicalId)).limit(1);
  if (!dbNode) {
    return {
      id: canonicalId,
      title: "Node Not Found",
      kind: "unknown",
      year: null,
      desc: `Error: Node ${canonicalId} was not found in the database.`,
      client: null,
      role: null,
      body: `Error: Node ${canonicalId} does not exist in the database index. Make sure to search the archive first using searchArchive to locate the correct ID.`,
      confidential: 0
    };
  }

  const fileData = readMarkdownFileDirectly(canonicalId);
  if (fileData) {
    return {
      id: dbNode.id,
      title: fileData.frontmatter.title || dbNode.title,
      kind: dbNode.kind,
      year: fileData.frontmatter.year || dbNode.year,
      desc: fileData.frontmatter.desc || dbNode.desc,
      client: fileData.frontmatter.client || dbNode.client,
      role: fileData.frontmatter.primary_role || fileData.frontmatter.role || dbNode.role,
      body: fileData.body,
      confidential: dbNode.confidential ?? 0
    };
  }

  return {
    id: dbNode.id,
    title: dbNode.title,
    kind: dbNode.kind,
    year: dbNode.year,
    desc: dbNode.desc,
    client: dbNode.client,
    role: dbNode.role,
    body: translateMediaUrls(dbNode.body || ""),
    confidential: dbNode.confidential ?? 0
  };
}

export async function getTimelineEras() {
  const results = await db
    .select({
      id: nodes.id,
      title: nodes.title,
      kind: nodes.kind,
      year: nodes.year
    })
    .from(nodes)
    .orderBy(nodes.year);
  return results;
}

// Define LLM tools for database and file traversal
export const searchArchiveTool = ai.defineTool(
  {
    name: "searchArchive",
    description: "Search the database index for keywords, project names, clients, agencies, or people. Returns a list of matching node IDs, titles, and kinds.",
    inputSchema: z.object({ query: z.string().describe("The search term or keyword") }),
    outputSchema: z.array(z.object({
      id: z.string(),
      title: z.string(),
      kind: z.string(),
      year: z.number().nullable(),
      desc: z.string().nullable(),
      confidential: z.number()
    }))
  },
  async ({ query }) => searchArchive(query)
);

export const getNodeDetailsTool = ai.defineTool(
  {
    name: "getNodeDetails",
    description: "Retrieve the full narrative narrative body, description, client, role, year, and connected relations for a specific node ID (e.g. 'project:wk_nike_better_world', 'person:chris_boyle', 'agency:poke_london', or 'industry:mcp'). Use this when the user asks about a specific project, agency, person, or industry log/guide.",
    inputSchema: z.object({ id: z.string().describe("The unique node ID") }),
    outputSchema: z.object({
      id: z.string(),
      title: z.string(),
      kind: z.string(),
      year: z.number().nullable(),
      desc: z.string().nullable(),
      client: z.string().nullable(),
      role: z.string().nullable(),
      body: z.string().nullable(),
      confidential: z.number()
    })
  },
  async ({ id }) => getNodeDetails(id)
);

export const getTimelineErasTool = ai.defineTool(
  {
    name: "getTimelineEras",
    description: "Get all indexed projects, agencies, and career hops in chronological order.",
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      id: z.string(),
      title: z.string(),
      kind: z.string(),
      year: z.number().nullable()
    }))
  },
  async () => getTimelineEras()
);
