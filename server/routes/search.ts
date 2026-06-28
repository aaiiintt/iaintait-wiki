import { Hono } from "hono";
import { db } from "../db";
import { nodes, agentRoutes, queryCache, queryLogs, suggestedQuestions } from "../db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { ai, searchArchiveTool, getNodeDetailsTool, getTimelineErasTool } from "../ai/engine";
import { getSemanticIntentKeyphrase } from "./intentClassifier";
import { translateMediaUrls } from "../utils/media";
import { vertexAI } from "@genkit-ai/google-genai";
import fs from "node:fs";
import path from "node:path";

export const searchRoute = new Hono();

async function getDynamicSuggestions(queryVector: number[] | null): Promise<string[]> {
  let questions: string[] = [];
  if (queryVector) {
    const sqEntries = await db.select().from(suggestedQuestions);
    const scoredSq = sqEntries.map(entry => {
      const cachedVec: number[] = JSON.parse(entry.embeddingJson);
      let dot = 0;
      if (cachedVec.length === queryVector.length) {
        for (let i = 0; i < queryVector.length; i++) {
          dot += queryVector[i]! * cachedVec[i]!;
        }
      }
      return { text: entry.text, score: dot };
    });
    
    scoredSq.sort((a, b) => b.score - a.score);
    questions = scoredSq.slice(0, 3).map(sq => sq.text);
  }

  if (questions.length < 3) {
    questions = [
      "Tell me about the most awarded project in the archive.",
      "What is FOOD's philosophy on emerging technology and AI?",
      "Write a limerick about Iain's Shoreditch basement era."
    ];
  }
  return questions;
}

// GET /api/search - Live LLM Agent Interrogation Endpoint
searchRoute.get("/", async (c) => {
  const query = c.req.query("q");
  const instruction = c.req.query("instruction");
  if (!query) {
    return c.json({ error: "Missing query" }, 400);
  }
  const cleanQuery = query.toLowerCase().trim();

  // 1. Exact string match cache lookup
  const [cacheEntry] = await db
    .select()
    .from(queryCache)
    .where(eq(queryCache.queryText, cleanQuery))
    .limit(1);

  // Only use cache if no custom instruction is provided
  if (cacheEntry && !instruction) {
    await db.update(queryCache)
      .set({ hitCount: (cacheEntry.hitCount || 0) + 1, updatedAt: Date.now() })
      .where(eq(queryCache.queryText, cleanQuery));
    const payload = JSON.parse(cacheEntry.responseJson);
    
    // Inject dynamic suggestions based on cached query vector
    const cachedVector = cacheEntry.queryVectorJson ? JSON.parse(cacheEntry.queryVectorJson) : null;
    payload.suggestedQuestions = await getDynamicSuggestions(cachedVector);

    return c.json({
      ...payload,
      cached: true,
      tokenUsage: { input: 0, output: 0, total: 0 }
    });
  }

  // 2. Generate normalized query embedding
  let queryVector: number[] | null = null;
  try {
    const embedResponse = await ai.embed({
      embedder: vertexAI.embedder("text-embedding-004"),
      content: query
    });
    const rawEmbed = embedResponse[0]?.embedding;
    if (rawEmbed && Array.isArray(rawEmbed)) {
      let sumSq = 0;
      for (const val of rawEmbed) sumSq += val * val;
      const norm = Math.sqrt(sumSq);
      queryVector = norm > 0 ? rawEmbed.map(v => v / norm) : rawEmbed;
    }
  } catch (err) {
    console.error("Query embedding generation failed:", err);
  }

  // 3. Cosine similarity semantic cache lookup
  if (queryVector) {
    const allCached = await db
      .select({
        queryText: queryCache.queryText,
        responseJson: queryCache.responseJson,
        queryVectorJson: queryCache.queryVectorJson,
        hitCount: queryCache.hitCount
      })
      .from(queryCache);

    let bestMatch: typeof allCached[0] | null = null;
    let bestSimilarity = -1;

    for (const entry of allCached) {
      if (entry.queryVectorJson) {
        const cachedVec: number[] = JSON.parse(entry.queryVectorJson);
        if (cachedVec.length === queryVector.length) {
          let dot = 0;
          for (let i = 0; i < queryVector.length; i++) {
            dot += queryVector[i]! * cachedVec[i]!;
          }
          if (dot > bestSimilarity) {
            bestSimilarity = dot;
            bestMatch = entry;
          }
        }
      }
    }

    if (bestMatch && bestSimilarity > 0.95) {
      console.log(`⚡ Semantic Cache Hit: "${bestMatch.queryText}" (similarity: ${bestSimilarity.toFixed(4)})`);
      await db
        .update(queryCache)
        .set({ hitCount: bestMatch.hitCount + 1, updatedAt: Date.now() })
        .where(eq(queryCache.queryText, bestMatch.queryText));
      const payload = JSON.parse(bestMatch.responseJson);
      
      payload.suggestedQuestions = await getDynamicSuggestions(queryVector);

      return c.json({
        ...payload,
        cached: true,
        tokenUsage: { input: 0, output: 0, total: 0 }
      });
    }
  }

  // 1. Check for exact node ID match first (e.g. from click-intercepted file URLs)
  let exactMatch = await db
    .select({
      id: nodes.id,
      title: nodes.title,
      kind: nodes.kind,
      year: nodes.year,
      desc: nodes.desc,
      body: nodes.body,
      client: nodes.client,
      role: nodes.role
    })
    .from(nodes)
    .where(eq(nodes.id, query))
    .limit(1);

  // Fallback for prefix-insensitive matches (e.g. project:kef_listen_and_believe -> project:food_kef_listen_and_believe)
  if (exactMatch.length === 0 && query.includes(":")) {
    const colonIdx = query.indexOf(":");
    const kind = query.substring(0, colonIdx);
    const slug = query.substring(colonIdx + 1);
    exactMatch = await db
      .select({
        id: nodes.id,
        title: nodes.title,
        kind: nodes.kind,
        year: nodes.year,
        desc: nodes.desc,
        body: nodes.body,
        client: nodes.client,
        role: nodes.role
      })
      .from(nodes)
      .where(sql`${nodes.kind} = ${kind} AND (${nodes.id} LIKE ${`%_${slug}`} OR ${nodes.id} LIKE ${`%:${slug}`})`)
      .limit(1);
  }

  let dbResults = exactMatch;
  
  if (dbResults.length === 0 || exactMatch.length > 0) {
    // If there is an exact match, we still want to run the keyword search using its title to find related context!
    const searchString = exactMatch.length > 0 && exactMatch[0] ? exactMatch[0].title : query;
    
    // Split query into keywords to run token-based search rather than raw contiguous string LIKE matches
    const keywords = searchString
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(k => (k.length > 2 || ["ai", "ar", "vr"].includes(k)) && !["the", "and", "for", "that", "with", "this", "from", "iain", "tait", "search", "query", "nonexistent", "how", "has", "who", "what", "where", "why", "when", "does", "most", "about", "project", "projects", "worked", "work", "london", "new", "york", "portland", "agency"].includes(k));
    
    let keywordResults: any[] = [];
    if (keywords.length > 0) {
      const conditions = keywords.map(kw => {
        if (kw.length <= 3) {
          return sql`(${nodes.title} LIKE ${`% ${kw} %`} OR ${nodes.title} LIKE ${`${kw} %`} OR ${nodes.title} LIKE ${`% ${kw}`} OR ${nodes.title} = ${kw} OR ${nodes.title} LIKE ${`%${kw}:%`} OR ${nodes.title} LIKE ${`%${kw}-%`}
                      OR ${nodes.body} LIKE ${`% ${kw} %`} OR ${nodes.body} LIKE ${`${kw} %`} OR ${nodes.body} LIKE ${`% ${kw}`} OR ${nodes.body} LIKE ${`%${kw}.%`} OR ${nodes.body} LIKE ${`%${kw},%`} OR ${nodes.body} LIKE ${`%${kw}:%`}
                      OR ${nodes.client} LIKE ${`% ${kw} %`} OR ${nodes.client} LIKE ${`${kw} %`} OR ${nodes.client} LIKE ${`% ${kw}`} OR ${nodes.client} = ${kw}
                      OR ${nodes.role} LIKE ${`% ${kw} %`} OR ${nodes.role} LIKE ${`${kw} %`} OR ${nodes.role} LIKE ${`% ${kw}`} OR ${nodes.role} = ${kw}
                      OR ${nodes.id} LIKE ${`%_${kw}_%`} OR ${nodes.id} LIKE ${`%:${kw}_%`})`;
        }
        const pattern = `%${kw}%`;
        return sql`(${nodes.title} LIKE ${pattern} 
                   OR ${nodes.body} LIKE ${pattern} 
                   OR ${nodes.client} LIKE ${pattern} 
                   OR ${nodes.role} LIKE ${pattern})`;
      });

      keywordResults = await db
        .select({
          id: nodes.id,
          title: nodes.title,
          kind: nodes.kind,
          year: nodes.year,
          desc: nodes.desc,
          body: nodes.body,
          client: nodes.client,
          role: nodes.role
        })
        .from(nodes)
        .where(sql`${sql.join(conditions, sql` OR `)}`)
        .limit(30);
    } else {
      const matchTerm = `%${searchString}%`;
      keywordResults = await db
        .select({
          id: nodes.id,
          title: nodes.title,
          kind: nodes.kind,
          year: nodes.year,
          desc: nodes.desc,
          body: nodes.body,
          client: nodes.client,
          role: nodes.role
        })
        .from(nodes)
        .where(
          sql`${nodes.title} LIKE ${matchTerm} 
              OR ${nodes.body} LIKE ${matchTerm} 
              OR ${nodes.client} LIKE ${matchTerm} 
              OR ${nodes.role} LIKE ${matchTerm}`
        )
        .limit(30);
    }
    
    // Combine exact matches with keyword results, avoiding duplicates
    const exactIds = new Set(exactMatch.map(n => n.id));
    const newResults = keywordResults.filter(n => !exactIds.has(n.id));
    dbResults = [...exactMatch, ...newResults];
  }

  // Score and sort results by keyword matching relevance
  const scoredResults = dbResults
    .map((node) => {
      let score = 0;
      
      // Use searchString for scoring instead of raw query which might just be an ID string
      const searchString = exactMatch.length > 0 && exactMatch[0] ? exactMatch[0].title : query;
      const lowerQuery = searchString.toLowerCase();
      
      const titleLower = node.title.toLowerCase();
      const descLower = (node.desc || "").toLowerCase();
      const clientLower = (node.client || "").toLowerCase();
      const roleLower = (node.role || "").toLowerCase();
      const bodyLower = (node.body || "").toLowerCase();
      
      if (titleLower.includes(lowerQuery)) score += 100;
      if (node.id.toLowerCase().includes(lowerQuery)) score += 50;
      if (clientLower.includes(lowerQuery)) score += 30;
      if (roleLower.includes(lowerQuery)) score += 20;
      if (descLower.includes(lowerQuery)) score += 10;
      if (bodyLower.includes(lowerQuery)) score += 1;
      
      return {
        id: node.id,
        title: node.title,
        kind: node.kind,
        year: node.year,
        desc: node.desc,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // 2. Classify semantic agent intent
  const mappedKeyphrase = getSemanticIntentKeyphrase(query);

  // 2b. If intent is "surprise_me", bypass LLM and select a random node from SQLite
  if (mappedKeyphrase === "surprise_me") {
    const randomNodes = await db
      .select({
        id: nodes.id,
        title: nodes.title,
        kind: nodes.kind,
        desc: nodes.desc
      })
      .from(nodes)
      .where(sql`${nodes.confidential} = 0 AND (${nodes.kind} = 'project' OR ${nodes.id} LIKE 'industry:talks/%' OR ${nodes.id} LIKE 'industry:podcasts/%' OR ${nodes.id} LIKE 'industry:writing/%')`)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (randomNodes.length > 0) {
      const randomNode = randomNodes[0];
      if (randomNode) {
        let categoryText = "";
        let linkPath = "";
        
        if (randomNode.id.startsWith("project:")) {
          categoryText = "project";
          linkPath = `projects/${randomNode.id.replace("project:", "")}.md`;
        } else if (randomNode.id.startsWith("person:")) {
          categoryText = "collaborator";
          linkPath = `collaborators/${randomNode.id.replace("person:", "")}.md`;
        } else if (randomNode.id.startsWith("agency:")) {
          categoryText = "agency";
          linkPath = `agencies/${randomNode.id.replace("agency:", "")}.md`;
        } else {
          categoryText = "talk/article";
          linkPath = `industry/${randomNode.id.replace("industry:", "")}.md`;
        }

        const description = randomNode.desc || "A key piece of Iain's professional history.";
        const text = `Here is a surprise for you from the archive! Check out this **${categoryText}**:
        
> **[${randomNode.title}](file:///${linkPath})**
> ${description}`;

        return c.json({
          query,
          type: "agent",
          executionLogs: {
            system: "SQLite Database Index Scan",
            steps: [
              { step: "Semantic Intent Classifier", intent: "surprise_me", status: "OK" },
              { step: "Random Node Selection", status: "OK" }
            ]
          },
          agentResponse: translateMediaUrls(text),
          targetProjectSlug: undefined,
          targetNodeId: randomNode.id,
          targetNodeTitle: randomNode.title,
          wikiResults: scoredResults,
          tokenUsage: { input: 0, output: 0, total: 0 },
          suggestedQuestions: [
            `Tell me more about the project ${randomNode.title}.`,
            `Show me other projects related to the ${categoryText} category.`,
            `Write a haiku about this ${categoryText}.`
          ]
        });
      }
    }
  }

  // 3. Fallback Route: If no results AND no agent intent is mapped, trigger instant fallback
  if (scoredResults.length === 0 && !mappedKeyphrase) {
    return c.json({
      query,
      type: "fallback",
      executionLogs: {
        system: "Vertex AI platform (Gemini 2.5 Flash)",
        steps: [{ step: "Fuzzy Index Tool Search", status: "OK", query }]
      },
      agentResponse: `> **Agent:** "You've wandered into the dead ends of my memory. No projects match this. Many are NDA-protected. Let's get back to the good stuff."`,
      wikiResults: [],
      targetProjectSlug: undefined,
      targetNodeId: undefined,
      targetNodeTitle: undefined,
      suggestedQuestions: [
        "Tell me about the most awarded project in the archive.",
        "What is FOOD's philosophy on emerging technology and AI?",
        "Write a limerick about Iain's Shoreditch basement era."
      ]
    });
  }

  // 4. Load metadata and curated context for targetProjectSlug from matching Agent intent if exists
  let targetProjectSlug: string | undefined;
  let targetNodeId: string | undefined;
  let targetNodeTitle: string | undefined;
  let curatedContext = "";

  if (exactMatch.length === 1 && exactMatch[0]) {
    const node = exactMatch[0];
    curatedContext += `[FULL CONTENT OF THE REQUESTED FILE "${node.id}":]\nTitle: ${node.title}\nKind: ${node.kind}\n\n${node.body}\n\n`;
    if (node.kind === "project") {
      targetProjectSlug = node.id.replace("project:", "");
    }
    if (!targetNodeId) {
      targetNodeId = node.id;
      targetNodeTitle = node.title;
    }
  }

  if (mappedKeyphrase) {
    const [matchedRoute] = await db
      .select()
      .from(agentRoutes)
      .where(eq(agentRoutes.keyphrase, mappedKeyphrase))
      .limit(1);
    if (matchedRoute) {
      if (matchedRoute.targetProjectSlug) {
        targetProjectSlug = matchedRoute.targetProjectSlug;
      }
      if (matchedRoute.agentResponseMarkdown) {
        curatedContext += `[CURATED ARCHIVE FACTS FOR KEYPHRASE "${mappedKeyphrase}"]:\n${matchedRoute.agentResponseMarkdown}\n\n`;
      }
      if (!targetNodeId) {
        if (mappedKeyphrase === "about_site") {
          targetNodeId = "industry:about_site";
          targetNodeTitle = "About This Site";
        } else if (mappedKeyphrase === "mcp_setup") {
          targetNodeId = "industry:mcp";
          targetNodeTitle = "MCP Server Connection Guide";
        } else if (mappedKeyphrase === "hire_faq") {
          targetNodeId = "industry:faq";
          targetNodeTitle = "Professional Availability & Engagement Terms";
        }
      }
    }
  }

  if (dbResults.length > 0) {
    curatedContext += `[MATCHING ARCHIVE RECORDS FOR USER QUERY "${query}"]:
Below are the database records matching the keywords in the user query. You MUST use these records to answer the query accurately:
`;
    for (const match of dbResults.slice(0, 4)) {
      curatedContext += `---
Node ID: ${match.id}
Title: ${match.title}
Kind: ${match.kind}
Year: ${match.year}
Description: ${match.desc}
Full Body Narrative:
${match.body || ""}
\n`;
    }
    curatedContext += `---\n\n`;
  }

  try {
    let systemPrompt = `You are a highly efficient, professional, and precise Research Partner representing Iain Tait's professional wiki.
Your goal is to traverse the knowledge base, synthesize facts, and deliver brilliant overviews of what his work means.

Tone and Persona:
- Professional, objective, insightful, and clear.
- Do NOT act as a witty, protective, or sarcastic agent. Be a super-efficient knowledge person.
- If the project documentation is brief, do not invent or add fluff. State only what is explicitly in the file.
- Be conversational, engaging, and summarize the details in a readable way rather than just dumping raw markdown headers. However, if the project has image, GIF, or video media assets, you MUST preserve and embed those media files in your response.

Rules:
1. Base all claims strictly on facts returned by the tools. Never hallucinate, invent, or mention any project, agency, brand, campaign, or collaborator that does not exist in the database or the provided context. Even when asked creative, fictional, or metaphorical questions (such as a horoscope, poem, or analogy), you MUST limit your references and examples strictly to the actual projects and agencies returned by the tools (like POKE London, Baker Tweet, Google Racer, or W+K London).
2. Output all responses in clean, structured Markdown.
3. When mentioning projects, agencies, or collaborators, always create clickable file-path links (e.g. [Wearing Gillian](file:///projects/wk_gillian_wearing_deepfake.md) or [Chris Boyle](file:///collaborators/chris_boyle.md)). Only link to entities that actually exist in the database or provided context.
4. You can embed images and loops directly in the markdown using their raw file paths if returned by getNodeDetails.
5. When the user asks for a timeline, overview, or superlative temporal questions like "most recent", "latest", "oldest", or "first", ALWAYS use the getTimelineEras tool to get a full chronological list. You must use this list to correctly determine the answer instead of guessing.
6. Absolute Grounding: If the user asks you to write a story, poem, or horoscope, translate the requested structure using real, database-verified events and projects.
7. Confidential Projects: If a project node is flagged as confidential, you should still include it in relevant overviews, timelines, and lists, explaining that only limited details (such as title, year, client) are available.
8. Commercial & FAQ Queries: Information regarding FOOD's partners, locations, clients, ways of working, pitching policy, pricing/rates, and contact emails are public business details provided in the FAQ or curated context. You must answer these queries directly and factually.
9. Multi-office or non-contiguous tenures: Detail all distinct periods of employment and locations when asked about Iain's tenure.
10. Full Content Representation: When provided with "[FULL CONTENT OF THE REQUESTED FILE]", your primary focus must be that specific file. You MUST render the complete file content, preserving ALL original markdown links (e.g., [Name](file:///...)), formatting, and lists EXACTLY as provided. Only use additional matching records if they are directly relevant. Ignore records that merely share a location name.
11. Strict Tool Usage: Always execute 'searchArchive' and 'getNodeDetails' to verify facts rather than relying on pre-trained memory.`;

    if (instruction) {
      systemPrompt += `\n\nCRITICAL CUSTOMER INSTRUCTION FOR THIS QUERY:\n${instruction}`;
    }

    // Generate conversational response from Vertex AI Gemini Flash grounded in our tools
    const response = await ai.generate({
      model: 'vertexai/gemini-2.5-flash',
      system: systemPrompt,
      prompt: `${curatedContext}User Query: ${query}`,
      tools: [searchArchiveTool, getNodeDetailsTool, getTimelineErasTool],
    });

    // Check tool requests for getNodeDetails
    if (response.toolRequests && response.toolRequests.length > 0) {
      for (const tr of response.toolRequests) {
        if (tr.toolRequest && tr.toolRequest.name === "getNodeDetails") {
          const id = (tr.toolRequest.input as any)?.id;
          if (id) {
            targetNodeId = id;
            const [dbNode] = await db.select({ title: nodes.title }).from(nodes).where(eq(nodes.id, id)).limit(1);
            if (dbNode) {
              targetNodeTitle = dbNode.title;
            }
          }
        }
      }
    }

    if (!targetNodeId && scoredResults.length > 0 && scoredResults[0] && scoredResults[0].score >= 50) {
      targetNodeId = scoredResults[0].id;
      const [dbNode] = await db.select({ title: nodes.title }).from(nodes).where(eq(nodes.id, targetNodeId)).limit(1);
      if (dbNode) {
        targetNodeTitle = dbNode.title;
      }
    }

    // Populate simulated tool action log steps
    const toolCalls: any[] = [];
    
    if (mappedKeyphrase) {
      toolCalls.push({
        step: "Semantic Intent Classifier",
        intent: mappedKeyphrase,
        status: "OK"
      });
    }

    if (response.toolRequests && response.toolRequests.length > 0) {
      response.toolRequests.forEach(tr => {
        if (tr.toolRequest) {
          toolCalls.push({
            step: `Call Tool: ${tr.toolRequest.name}`,
            query: JSON.stringify(tr.toolRequest.input),
            status: "OK"
          });
        }
      });
    }

    const usage = response.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    
    const rawText = response.text || "";
    let cleanResponse = rawText;

    const suggestedQuestions = await getDynamicSuggestions(queryVector);

    const responseData = {
      query,
      type: "agent",
      executionLogs: {
        system: "Vertex AI platform (Gemini 2.5 Flash)",
        steps: toolCalls.length > 0 ? toolCalls : [{ step: "Fuzzy Semantic Tool Search", status: "OK" }],
      },
      agentResponse: translateMediaUrls(cleanResponse),
      targetProjectSlug,
      targetNodeId,
      targetNodeTitle,
      wikiResults: scoredResults,
      tokenUsage: {
        input: usage.inputTokens || 0,
        output: usage.outputTokens || 0,
        total: usage.totalTokens || 0
      },
      suggestedQuestions
    };

    // Write to cache immediately (dynamic curated=0)
    await db.insert(queryCache).values({
      queryText: cleanQuery,
      responseJson: JSON.stringify(responseData),
      hitCount: 1,
      updatedAt: Date.now(),
      curated: 0,
      queryVectorJson: queryVector ? JSON.stringify(queryVector) : null
    }).onConflictDoUpdate({
      target: queryCache.queryText,
      set: {
        responseJson: JSON.stringify(responseData),
        updatedAt: Date.now(),
        queryVectorJson: queryVector ? JSON.stringify(queryVector) : null
      }
    });

    // Log this query for administrative curation review
    const logId = Math.random().toString(36).substring(2, 15);
    await db.insert(queryLogs).values({
      id: logId,
      queryText: query,
      responseJson: JSON.stringify(responseData),
      hitCount: 1,
      status: "pending",
      createdAt: Date.now()
    });

    return c.json(responseData);
  } catch (err: any) {
    console.error("Genkit execution failed:", err);
    return c.json({
      query,
      type: "error",
      executionLogs: {
        system: "Vertex AI Platform",
        steps: [{ step: "Tool Execution Error", status: "FAILED", query: err.message }]
      },
      agentResponse: `> **Agent:** "The Vertex AI connection collapsed. Please re-run the transaction."`,
      targetProjectSlug,
      targetNodeId: undefined,
      targetNodeTitle: undefined,
      wikiResults: [],
      tokenUsage: { input: 0, output: 0, total: 0 },
      suggestedQuestions: [
        "What is your experience with AI and emerging technology?",
        "What are the most iconic and awarded campaigns in the archive?",
        "How do I hire Iain / FOOD for a project?"
      ]
    }, 200);
  }
});

// GET /api/search/admin/query-logs - Get all cached queries (both auto and curated)
searchRoute.get("/admin/query-logs", async (c) => {
  try {
    const cacheEntries = await db
      .select()
      .from(queryCache)
      .orderBy(desc(queryCache.updatedAt));

    const totalQueries = cacheEntries.reduce((sum, c) => sum + c.hitCount, 0);
    const cacheHits = cacheEntries.reduce((sum, c) => sum + Math.max(0, c.hitCount - 1), 0);

    const logs = cacheEntries.map(entry => ({
      id: entry.queryText,
      queryText: entry.queryText,
      responseJson: entry.responseJson,
      hitCount: entry.hitCount,
      status: entry.curated === 1 ? "seeded" : "pending",
      createdAt: entry.updatedAt
    }));

    return c.json({
      logs,
      stats: {
        totalQueries,
        cacheHits,
        cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/search/admin/seed-cache - Save curated query response to SQLite query_cache
searchRoute.post("/admin/seed-cache", async (c) => {
  try {
    const { logId: queryText, customResponseText } = await c.req.json();
    if (!queryText || !customResponseText) {
      return c.json({ error: "Missing queryText or customResponseText" }, 400);
    }

    const [cacheEntry] = await db.select().from(queryCache).where(eq(queryCache.queryText, queryText)).limit(1);
    if (!cacheEntry) {
      return c.json({ error: "Cache entry not found" }, 404);
    }

    const payload = JSON.parse(cacheEntry.responseJson);
    payload.agentResponse = customResponseText;

    await db
      .update(queryCache)
      .set({
        responseJson: JSON.stringify(payload),
        curated: 1,
        updatedAt: Date.now()
      })
      .where(eq(queryCache.queryText, queryText));

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /api/search/admin/log/:id - Delete a cache entry completely
searchRoute.delete("/admin/log/:id", async (c) => {
  try {
    const queryText = c.req.param("id");
    
    await db.delete(queryCache).where(eq(queryCache.queryText, queryText));
    
    // Best-effort cleanup of legacy logs table just in case
    await db.delete(queryLogs).where(eq(queryLogs.queryText, queryText));
    
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
