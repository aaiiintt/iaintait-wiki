import { Hono } from "hono";
import { db } from "../db";
import { nodes, agentRoutes, queryCache, queryLogs } from "../db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { ai, searchArchiveTool, getNodeDetailsTool, getTimelineErasTool } from "../ai/engine";
import { getSemanticIntentKeyphrase } from "./intentClassifier";
import { translateMediaUrls } from "../utils/media";
import { vertexAI } from "@genkit-ai/google-genai";

export const searchRoute = new Hono();

// GET /api/search - Live LLM Agent Interrogation Endpoint
searchRoute.get("/", async (c) => {
  const query = c.req.query("q")?.trim() || "";

  if (!query) {
    return c.json({ error: "Empty query" }, 400);
  }

  const cleanQuery = query.toLowerCase().trim();

  // 1. Exact string match cache lookup
  const [cachedMatch] = await db
    .select()
    .from(queryCache)
    .where(eq(queryCache.queryText, cleanQuery))
    .limit(1);

  if (cachedMatch) {
    await db
      .update(queryCache)
      .set({ hitCount: cachedMatch.hitCount + 1, updatedAt: Date.now() })
      .where(eq(queryCache.queryText, cleanQuery));
    const payload = JSON.parse(cachedMatch.responseJson);
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
  
  if (dbResults.length === 0) {
    // Split query into keywords to run token-based search rather than raw contiguous string LIKE matches
    const keywords = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(k => (k.length > 2 || ["ai", "ar", "vr"].includes(k)) && !["the", "and", "for", "that", "with", "this", "from", "iain", "tait", "search", "query", "nonexistent", "how", "has", "who", "what", "where", "why", "when", "does", "most", "about", "project", "projects", "worked", "work"].includes(k));
    
    if (keywords.length > 0) {
      const conditions = keywords.map(kw => {
        if (kw.length <= 3) {
          return sql`(${nodes.title} LIKE ${`% ${kw} %`} OR ${nodes.title} LIKE ${`${kw} %`} OR ${nodes.title} LIKE ${`% ${kw}`} OR ${nodes.title} = ${kw}
                      OR ${nodes.body} LIKE ${`% ${kw} %`} OR ${nodes.body} LIKE ${`${kw} %`} OR ${nodes.body} LIKE ${`% ${kw}`}
                      OR ${nodes.client} LIKE ${`% ${kw} %`} OR ${nodes.client} LIKE ${`${kw} %`} OR ${nodes.client} LIKE ${`% ${kw}`}
                      OR ${nodes.role} LIKE ${`% ${kw} %`} OR ${nodes.role} LIKE ${`${kw} %`} OR ${nodes.role} LIKE ${`% ${kw}`})`;
        }
        const pattern = `%${kw}%`;
        return sql`(${nodes.title} LIKE ${pattern} 
                   OR ${nodes.body} LIKE ${pattern} 
                   OR ${nodes.client} LIKE ${pattern} 
                   OR ${nodes.role} LIKE ${pattern})`;
      });

      dbResults = await db
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
      const matchTerm = `%${query}%`;
      dbResults = await db
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
  }

  // Score and sort results by keyword matching relevance
  const scoredResults = dbResults
    .map((node) => {
      let score = 0;
      const lowerQuery = query.toLowerCase();
      
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

  if (exactMatch.length > 0 && exactMatch[0]) {
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
- Highlight Iain's unique creative signature: a rare blend of creative technology that's always been ahead of the curve, combined with being incredibly human, accessible, and humble.
- Always begin your response by briefly outlining the research strategy or search techniques you are using to fetch the information (e.g. "I am scanning the database for 'AI' projects and retrieving their direct markdown files to analyze the technical and creative execution..."). EXCEPTION: If the user explicitly requests a creative format—such as a poem, a limerick, a song, a haiku, a fictional story, or ASCII art—you MUST bypass this research outline entirely and deliver the creative content immediately with no introductory agent dialogue.

Rules:
1. Base all claims strictly on facts returned by the tools. Never hallucinate, invent, or mention any project, agency, brand, campaign, or collaborator that does not exist in the database or the provided context. Even when asked creative, fictional, or metaphorical questions (such as a horoscope, poem, or analogy), you MUST limit your references and examples strictly to the actual projects and agencies returned by the tools (like POKE London, Baker Tweet, Google Racer, or W+K London).
2. Output all responses in clean, structured Markdown.
3. When mentioning projects, agencies, or collaborators, always create clickable file-path links (e.g. [Wearing Gillian](file:///projects/wk_gillian_wearing_deepfake.md) or [Chris Boyle](file:///collaborators/chris_boyle.md)). Only link to entities that actually exist in the database or provided context.
4. You can embed images and loops directly in the markdown using their raw file paths if returned by getNodeDetails.
5. When the user asks for a timeline or overview, use getTimelineEras to map out his hops.
6. Absolute Grounding: If the user asks you to write a story, poem, or horoscope, translate the requested structure using real, database-verified events and projects.
7. Confidential Projects: If a project node is flagged as confidential, you should still include it in relevant overviews, timelines, and lists, explaining that only limited details (such as title, year, client) are available.
8. Commercial & FAQ Queries: Information regarding FOOD's partners, locations, clients, ways of working, pitching policy, pricing/rates, and contact emails are public business details provided in the FAQ or curated context. You must answer these queries directly and factually.
9. Multi-office or non-contiguous tenures: Detail all distinct periods of employment and locations when asked about Iain's tenure.
10. Full Content Representation: When provided with "[FULL CONTENT OF THE REQUESTED FILE]", render the complete file content, connection details, and instructions exactly as written.
11. Suggestions Requirement: At the very end of your response, you MUST output exactly three suggested follow-up queries that the user can ask next based on the content of your response.
The three questions MUST follow this exact structure:
- Question 1 MUST be a specific plain text follow-up about a related project, talk, or agency mentioned in your response (e.g., "Tell me more about the project Google Racer" or "What did Iain do at POKE London?").
- Question 2 MUST be a broader plain text question about a related category or theme (e.g. AI projects, creative technology, spatial anchors, or D&AD awards).
- Question 3 MUST be a fun, creative, or novel plain text query (e.g. asking for a limerick, a haiku, or a pirate rewrite).

Do NOT include any Markdown links, file path links, brackets, or formatting inside the suggested questions. They must be raw, plain text strings. Format them exactly like this:

SUGGESTIONS:
- [Question 1]
- [Question 2]
- [Question 3]
12. Strict Tool Usage: Always execute 'searchArchive' and 'getNodeDetails' to verify facts rather than relying on pre-trained memory.`;

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
    
    // Parse out suggestions from model response text
    const rawText = response.text || "";
    const suggestionsMatch = rawText.match(/SUGGESTIONS:\s*([\s\S]*)$/i);
    let cleanResponse = rawText;
    let suggestedQuestions: string[] = [];
    
    if (suggestionsMatch && suggestionsMatch[1]) {
      cleanResponse = rawText.replace(/SUGGESTIONS:[\s\S]*$/i, "").trim();
      suggestedQuestions = suggestionsMatch[1]
        .split("\n")
        .map(line => {
          let cleanLine = line
            .replace(/^-\s*/, "")
            .replace(/^\[|\]$/g, "")
            .replace(/^\*|^\d+\.\s*/, "")
            .trim();
          // Strip any markdown link syntax e.g. [Google Racer](file:///...) -> Google Racer
          cleanLine = cleanLine.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
          return cleanLine;
        })
        .filter(line => line.length > 0)
        .slice(0, 3);
    }

    if (suggestedQuestions.length < 3) {
      suggestedQuestions = [
        "Tell me about the most awarded project in the archive.",
        "What is FOOD's philosophy on emerging technology and AI?",
        "Write a limerick about Iain's Shoreditch basement era."
      ];
    }

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

// GET /api/search/admin/query-logs - Get all logged user queries
searchRoute.get("/admin/query-logs", async (c) => {
  try {
    const logs = await db
      .select()
      .from(queryLogs)
      .orderBy(desc(queryLogs.createdAt));

    // Also get cache hit statistics to display on the dashboard
    const cacheEntries = await db.select().from(queryCache);
    const totalQueries = logs.reduce((sum, l) => sum + l.hitCount, 0) + cacheEntries.reduce((sum, c) => sum + c.hitCount - 1, 0);
    const cacheHits = cacheEntries.reduce((sum, c) => sum + c.hitCount - 1, 0);

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

// POST /api/search/admin/seed-cache - Seed an edited query response into query_cache
searchRoute.post("/admin/seed-cache", async (c) => {
  try {
    const { logId, customResponseText } = await c.req.json();
    if (!logId || !customResponseText) {
      return c.json({ error: "Missing logId or customResponseText" }, 400);
    }

    const [log] = await db.select().from(queryLogs).where(eq(queryLogs.id, logId)).limit(1);
    if (!log) {
      return c.json({ error: "Log entry not found" }, 404);
    }

    // Parse existing response payload and update the agentResponse text
    const payload = JSON.parse(log.responseJson);
    payload.agentResponse = customResponseText;

    const cleanQuery = log.queryText.toLowerCase().trim();

    // Look up query vector if exists
    let queryVectorJson: string | null = null;
    try {
      const embedResponse = await ai.embed({
        embedder: vertexAI.embedder("text-embedding-004"),
        content: log.queryText
      });
      const rawEmbed = embedResponse[0]?.embedding;
      if (rawEmbed && Array.isArray(rawEmbed)) {
        let sumSq = 0;
        for (const val of rawEmbed) sumSq += val * val;
        const norm = Math.sqrt(sumSq);
        const queryVector = norm > 0 ? rawEmbed.map(v => v / norm) : rawEmbed;
        queryVectorJson = JSON.stringify(queryVector);
      }
    } catch (e) {
      console.error("Embedding generation failed for seeding:", e);
    }

    // Save/update in the cache as curated (curated = 1)
    await db
      .insert(queryCache)
      .values({
        queryText: cleanQuery,
        responseJson: JSON.stringify(payload),
        hitCount: log.hitCount,
        updatedAt: Date.now(),
        curated: 1,
        queryVectorJson
      })
      .onConflictDoUpdate({
        target: queryCache.queryText,
        set: {
          responseJson: JSON.stringify(payload),
          updatedAt: Date.now(),
          curated: 1,
          queryVectorJson
        }
      });

    // Update log status to seeded
    await db
      .update(queryLogs)
      .set({ status: "seeded", responseJson: JSON.stringify(payload) })
      .where(eq(queryLogs.id, logId));

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
