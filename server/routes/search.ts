import { Hono } from "hono";
import { db } from "../db";
import { nodes, agentRoutes } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { ai, searchArchiveTool, getNodeDetailsTool, getTimelineErasTool } from "../ai/engine";
import { getSemanticIntentKeyphrase } from "./intentClassifier";
import { translateMediaUrls } from "../utils/media";

export const searchRoute = new Hono();

// GET /api/search - Live LLM Agent Interrogation Endpoint
searchRoute.get("/", async (c) => {
  const query = c.req.query("q")?.trim() || "";

  if (!query) {
    return c.json({ error: "Empty query" }, 400);
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
          terminalLogs: {
            system: "SQLite Database Index Scan",
            actions: [
              { step: "Semantic Intent Classifier", intent: "surprise_me", status: "OK" },
              { step: "Random Node Selection", status: "OK" }
            ]
          },
          agentResponse: translateMediaUrls(text),
          targetProjectSlug: undefined,
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
      terminalLogs: {
        system: "Vertex AI platform (Gemini 2.5 Flash)",
        actions: [{ step: "Fuzzy Index Scan", status: "OK", query }]
      },
      agentResponse: `> **Agent:** "You've wandered into the dead ends of my memory. No projects match this. Many are NDA-protected. Let's get back to the good stuff."`,
      wikiResults: [],
      suggestedQuestions: [
        "Tell me about the most awarded project in the archive.",
        "What is FOOD's philosophy on emerging technology and AI?",
        "Write a limerick about Iain's Shoreditch basement era."
      ]
    });
  }

  // 4. Load metadata and curated context for targetProjectSlug from matching Agent intent if exists
  let targetProjectSlug: string | undefined;
  let curatedContext = "";

  if (exactMatch.length > 0 && exactMatch[0]) {
    const node = exactMatch[0];
    curatedContext += `[FULL CONTENT OF THE REQUESTED FILE "${node.id}":]\nTitle: ${node.title}\nKind: ${node.kind}\n\n${node.body}\n\n`;
    if (node.kind === "project") {
      targetProjectSlug = node.id.replace("project:", "");
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
    // Generate conversational response from Vertex AI Gemini Flash grounded in our tools
    const response = await ai.generate({
      model: 'vertexai/gemini-2.5-flash',
      system: `You are a highly efficient, professional, and precise Research Partner representing Iain Tait's professional wiki.
Your goal is to traverse the knowledge base, synthesize facts, and deliver brilliant overviews of what his work means.

Tone and Persona:
- Professional, objective, insightful, and clear.
- Do NOT act as a witty, protective, or sarcastic agent. Be a super-efficient knowledge person.
- Highlight Iain's unique creative signature: a rare blend of creative technology that's always been ahead of the curve, combined with being incredibly human, accessible, and humble.
- Always begin your response by briefly outlining the research strategy or search techniques you are using to fetch the information (e.g. "I am scanning the database for 'AI' projects and retrieving their direct markdown files to analyze the technical and creative execution..."). EXCEPTION: If the user explicitly requests a creative format—such as a poem, a limerick, a song, a haiku, a fictional story, or ASCII art—you MUST bypass this research outline entirely and deliver the creative content immediately with no introductory agent dialogue.

Rules:
1. Base all claims strictly on facts returned by the tools. Never hallucinate, invent, or mention any project, agency, brand, campaign, or collaborator that does not exist in the database or the provided context. Even when asked creative, fictional, or metaphorical questions (such as a horoscope, poem, or analogy), you MUST limit your references and examples strictly to the actual projects and agencies returned by the tools (like POKE London, Google Racer, Baker Tweet, FOOD, Wieden+Kennedy, etc.). Do not invoke external campaigns (like "Nike Grid" or "Museum of Me") that are not registered in the database.
2. Output all responses in clean, structured Markdown.
3. When mentioning projects, agencies, or collaborators, always create clickable file-path links (e.g. [Wearing Gillian](file:///projects/wk_gillian_wearing_deepfake.md) or [Chris Boyle](file:///collaborators/chris_boyle.md)). Only link to entities that actually exist in the database or provided context. Do NOT create links to entities that do not exist in this archive (e.g., Mother or Mother Ventures).
4. You can embed images and loops directly in the markdown using their raw file paths if returned by getNodeDetails.
5. When the user asks for a timeline or overview, use getTimelineEras to map out his hops.
6. Absolute Grounding: If the user asks you to write a story, poem, or horoscope, translate the requested structure using real, database-verified events and projects (e.g. referencing POKE London, Baker Tweet, Google Racer, or W+K London). If a request would force you to invent non-existent projects, refuse to invent them and offer to perform the creative task using verified projects instead.
7. Confidential Projects: If a project node is flagged as confidential, you should still include it in relevant overviews, timelines, and lists. You should explain to the user that because the project was confidential/subject to an NDA, only limited details (such as the title, year, and client) are available. Do not hide the project's existence or details.
8. Commercial & FAQ Queries: Information regarding FOOD's partners, locations, clients, ways of working, pitching policy, pricing/rates, and contact emails are public business details provided in the FAQ or curated context. You must answer these queries directly and factually using the provided info, rather than refusing them as confidential or private. For example, if asked about day rates, state directly that the rate depends on the assignment. If asked about how to join or apply, provide cook@food.xyz. If asked about partners, list Nick Farnhill, Richard Turley, Matt Clark, and Iain Tait.
9. Multi-office or non-contiguous tenures: When asked about Iain's tenure at an agency network (like Wieden+Kennedy or POKE), be aware that he may have served multiple non-contiguous tours or worked at different office locations (such as W+K Portland from 2010–2012 AND W+K London from 2014–2021). You must search for and detail all distinct periods of employment and locations, rather than stopping after the first departure.
10. When you are provided with "[FULL CONTENT OF THE REQUESTED FILE]", you MUST present the full content of that file to the user. If the file is a technical guide, setup manual, or contains configuration files/code blocks (like the MCP Server Connection Guide), do NOT summarize it or write about the file. Instead, render the complete content, connection details, JSON configurations, and instructions exactly as written in the file so the user has the complete guide.
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
12. Strict Tool Usage: You MUST always execute the 'searchArchive' tool to search for keywords related to the user's query (e.g. searching for "patents", "Wieden+Kennedy", "Google Racer", or "Nick Farnhill"). Do NOT rely on your own knowledge or pre-trained memory to list projects, dates, or details. After search results are returned, you MUST call 'getNodeDetails' for all relevant nodes (such as the project or agency node) to load their full factual content before constructing your response. This ensures that you have complete, verified, and grounded details for all relevant items.`,
      prompt: `${curatedContext}User Query: ${query}`,
      tools: [searchArchiveTool, getNodeDetailsTool, getTimelineErasTool],
    });

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

    return c.json({
      query,
      type: "agent",
      terminalLogs: {
        system: "Vertex AI platform (Gemini 2.5 Flash)",
        actions: toolCalls.length > 0 ? toolCalls : [{ step: "Fuzzy Semantic Search", status: "OK" }],
      },
      agentResponse: translateMediaUrls(cleanResponse),
      targetProjectSlug,
      wikiResults: scoredResults,
      tokenUsage: {
        input: usage.inputTokens || 0,
        output: usage.outputTokens || 0,
        total: usage.totalTokens || 0,
      },
      suggestedQuestions
    });
  } catch (err: any) {
    console.error("Genkit execution failed:", err);
    return c.json({
      query,
      type: "error",
      terminalLogs: {
        system: "Vertex AI Platform",
        actions: [{ step: "Execution Error", status: "FAILED", query: err.message }]
      },
      agentResponse: `> **Agent:** "The Vertex AI connection collapsed. Please re-run the transaction."`,
      targetProjectSlug,
      wikiResults: scoredResults,
      suggestedQuestions: [
        "What is your experience with AI and emerging technology?",
        "What are the most iconic and awarded campaigns in the archive?",
        "How do I hire Iain / FOOD for a project?"
      ]
    }, 200);
  }
});
