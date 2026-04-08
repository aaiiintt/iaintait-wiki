# PRD: The Iain Tait Vault
**Type:** Interactive Personal Wiki & MCP Server
**Date:** April 2026
**Objective:** A relentlessly modern, AI-native portfolio and archival engine. Built to win business, establish absolute LLM visibility, and demonstrate a bleeding-edge approach to data curation and interface design. 

## 1. Core Architecture & Stack
A unified monorepo prioritizing edge-speed, layout stability, and perfect semantic indexing.
* **Frontend & API Hosting:** Vercel (Astro monorepo for both the UI and the MCP Server).
* **Visual Engine:** `@chenglou/pretext` for absolute-positioned, high-performance typographic layouts.
* **Animation & Scroll:** GSAP (ScrollTrigger & Flip) + Lenis for buttery, vertical-to-horizontal scroll mapping and dynamic layout reflows.
* **Vector Database:** Supabase (pgvector) or Upstash Vector, optimized for edge retrieval.
* **Media Pipeline:** Cloudflare R2 (storage) + Cloudflare Stream (playback) + OpenAI Whisper (automated video transcription).
* **Source of Truth:** GitHub (Markdown files with strict YAML frontmatter).

## 2. AI Persona & Interaction Rules (The "Anti-Slop" Mandate)
The AI acts as an archivist representing Iain. It must strictly adhere to the following guardrails:
* **Voice:** Clear, concise, clever. Understated, factual, third-person.
* **Banned Behavior:** No AI pleasantries, no marketing hype ("visionary," "groundbreaking"), and zero hallucination of unlisted projects.
* **Style:** Answers directly and proves its work. (e.g., *"Yes. Notable mobile projects include X and Y, focusing on..."*)

## 3. Key Features & Workflows

### A. The "Sonic Grid" & Contextual Timeline
A Swiss-editorial layout that feels physical, driven by a timeline that contextualizes the work against global history.
* **Vertical-to-Horizontal Scroll:** Users scroll vertically with their mouse/trackpad, but the GSAP ScrollTrigger translates this into a smooth horizontal journey through time.
* **Contextual Toggles:** Users can toggle tracks on/off (Projects, Industry, Pop Culture, Technology). GSAP Flip seamlessly animates the remaining nodes to fill the gaps without performance lag.
* **Pretext Canvas + Shadow DOM:** Text is pre-measured for sub-millisecond layout stability. A hidden, standard HTML DOM renders beneath the Canvas to guarantee screen reader accessibility, native browser features, and LLM web-crawler indexing.
* **Micro-interactions:** Subtle physics paired with headless audio (Howler.js) for tactile feedback (soft clicks, deep thuds).
* **Inline Visual Citations:** When the AI references a project `[1]`, clicking the citation smoothly expands a grid-aligned thumbnail or muted video snippet directly within the text block.

### B. Omni-Search (Agentic RAG)
A single chat/search interface capable of complex semantic retrieval.
* **Contextual Embeddings:** Markdown files are indexed by text and an AI-generated hidden `contextual_summary` (capturing the *vibe* and *impact*) to enable abstract queries like *"times Iain was ahead of the curve."*
* **Media Awareness:** Video assets are automatically transcribed via Whisper upon upload. Transcripts are vectorized so the AI can quote spoken video content.

### C. The "Zero-Risk" Triage Loop
Allowing frictionless public contributions without compromising the GitHub repository.
* **The Trigger:** A visitor clicks "Suggest Edit" and types a natural language note into a brutalist web form. No file uploads. No login required.
* **The Shield:** Cloudflare Turnstile (invisible CAPTCHA) silently validates human traffic.
* **The AI Polish:** The Vercel backend LLM intercepts the text, formats it into a highly readable summary, checks it against existing data, and assigns a context note.
* **The Ticket:** The API automatically creates a clean **GitHub Issue** on the repository for Iain to review asynchronously. 

### D. The MCP (Model Context Protocol) Server
Exposing the vault to external AI agents (Claude Desktop, Gemini) so users can natively query the wiki in their own environments.
* **Transport Layer:** Vercel HTTP transport (using `@vercel/mcp-adapter` inside a Serverless Function).
* **Core Tools Exposed:**
    * `search_wiki(query)`: Performs semantic RAG search across the database.
    * `get_project_details(id)`: Returns the raw markdown frontmatter and content for a specific project or collaborator.

## 4. Automation & CI/CD Pipeline
1.  Markdown changes (projects, collaborators, timeline events) are merged to the `main` branch on GitHub.
2.  **GitHub Actions** fires: 
    * Re-parses the Markdown relational graph.
    * Generates new vector embeddings for any changed files (including contextual summaries).
    * Pushes updates to the Vector DB.
3.  **Vercel** automatically rebuilds the static Astro site, updates the GSAP timeline data arrays, and refreshes the edge functions.