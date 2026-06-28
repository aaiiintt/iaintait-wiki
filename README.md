# mcp-personal: Agent-Grounded Professional Archive & Remote MCP Server

This repository is an open-source template for building a forensic, agent-grounded professional archive and Model Context Protocol (MCP) server. 

This template is deployed personally by **aaiiintt** at **[mcp.aaiiintt.xyz](https://mcp.aaiiintt.xyz)**, mapping 25 years of work at the intersection of technology, culture, and creativity (incorporating [POKE London](agencies/poke_london.md), [Wieden+Kennedy Portland](agencies/wieden_and_kennedy_portland.md) & [London](agencies/wieden_and_kennedy_london.md), [Google Creative Lab](agencies/google_creative_lab.md), and [FOOD](agencies/food.md)). 

It is built as an **open knowledge engine** designed for the Smart Web. It exposes Iain's complete project history, collaborations, and patent records via a **hosted remote Model Context Protocol (MCP) Server** over HTTP, wrapped in a fastidious, minimalist typographic web interface.

---

## The Stack

* **Server/Backend**: [Hono](https://hono.dev/) running on Node.js (bi-directional Server-Sent Events for MCP, fast API router).
* **Database**: [SQLite](https://sqlite.org/) accessed via [Drizzle ORM](https://orm.drizzle.team/) for lightweight, sub-millisecond graph query matching.
* **Frontend**: React 19 + [Vite](https://vite.dev/) compiled cleanly with [Tailwind CSS v4](https://tailwindcss.com/).
* **Visual Design**: Pure-white canvas (`#FFFFFF`), hairline borders (`1px solid #EAEAEA`), and geometric system-native typography (**SF Pro Display** + JetBrains Mono) representing a grid-aligned "direct interaction with the machine."
* **Primary Source of Truth**: Preserves your local Markdown files (projects, collaborators, agencies, industry logs) formatted in the Open Knowledge Format, syncing changes to SQLite on command. For a deep dive into how compilation-phase builds structure the database schema, check the [Site Architecture Guide](industry/about_site.md).

---

## Directory Structure

```
[root]/
├── index.html                 ← Main HTML entry point
├── package.json               ← Merged project dependencies & pipeline scripts
├── tsconfig.json              ← Strict TypeScript configuration with alias paths
├── vite.config.ts             ← React plugin and API server proxy configuration
├── drizzle.config.ts          ← SQLite schema definition for Drizzle ORM
│
├── projects/                  ← Project Markdown nodes (Open Knowledge Format)
├── collaborators/             ← Collaborator profiles (Open Knowledge Format)
├── agencies/                  ← Agency profiles (Open Knowledge Format)
├── industry/                  ← Industry logs, FAQ, speaking, and writing files
├── raw/                       ← Ingestion media and asset files
│   └── media/                 ← Case study images, GIFs, and loop videos
│
├── server/                    ← Hono Backend
│   ├── index.ts               ← App entry point (mounting endpoints & static serving)
│   ├── db/
│   │   ├── index.ts           ← Libsql client connector
│   │   ├── schema.ts          ← Drizzle tables (nodes, edges, agent_routes)
│   │   └── sync.ts            ← Open Knowledge markdown to SQLite sync parser script
│   └── routes/
│       ├── mcp.ts             ← Remote MCP Server (SSE transport & tools executor)
│       ├── search.ts          ← Local query search (agent intent overrides & FTS5 fallback)
│       ├── nodes.ts           ← Detailed node fetcher (popcard data & media translators)
│       └── system.ts          ← Admin endpoints (sync triggers, tone updates, diagnostics)
│
├── src/                       ← React 19 Frontend
│   ├── main.tsx               ← App mounting script
│   ├── App.tsx                ← Layout (split screen console & timelines, right reader)
│   ├── index.css              ← CSS design system (SF Pro font stack, prose styling)
│   └── features/
│       ├── interrogator/      ← Query Console & suggestion buttons
│       ├── timeline/          ← Responsive ASCII chronological timeline tree
│       ├── inspector/         ← Notion-style reading pane with inline media
│       └── system/            ← Admin Dashboard & Agent Tone Playground
│
└── tests/                     ← Vitest suite (Hono routing & SSE stream verification)
```

---

## Ingest Pipeline (`npm run db:sync`)

Your SQLite database is generated dynamically from your markdown files. The ingestion pipeline:
1. Scans the root `README.md` and ingests it as the core system documentation node (`readme:about`).
2. Walks the markdown directories recursively (projects, collaborators, agencies, industry).
3. Parses YAML frontmatter (metadata) and markdown bodies.
4. Computes a **richness score** (words + 50 * external links + 30 * media assets) for search sorting.
5. Parses internal links (e.g. `[Stewart Smith](../collaborators/stewart_smith.md)`) and generates directional graph edges.
6. Deduplicates relationships and commits them to SQLite in a single transaction.
7. Seeds your **Agent Intent Routes** table with professional search strategies and responses.

---

## Web UI Features

### 1. The Interrogation Console
Located in the left panel, it simulates an interactive MCP server interrogation.
* Type questions directly, or tap suggested chips (e.g., *US Patents*, *MoMA Collections*, *Swearing Analytics*).
* **Intent Override**: If a keyword matches a pre-seeded agent route, a typewriter log prints the simulated tool calls showing database queries and tool execution steps before showing the agent's professional research response.
* **Fuzzy Fallback**: Other queries fall back to a SQLite database search. If records are found, it lists them. If no records are found, the agent objectively steers the user away from "dead ends" and back toward high-value project credentials.

### 2. The ASCII Timeline
A box-drawing visual representation of your career eras:
```
┌── Early Web & Syzygy (1995–2000)
├── POKE London (2001–2010)
├── Wieden+Kennedy Portland (2010–2012)
├── Google Creative Lab NY (2012–2014)
├── Wieden+Kennedy London (2014–2021)
└── FOOD Arts & Technology (2021–Present)
```
* Tapping an era expands the tree inline using box-drawing characters (`└──`, `├──`) to show projects under that era.
* Selecting a project opens it in the Document Inspector. Stacks to a scrollable accordion list on mobile screens.

### 3. Inline Media Inspector
The right panel parses your Open Knowledge markdown into clean, grid-aligned typography.
* **Inline Images & GIFs**: Rendered centered with thin borders.
* **Inline Loop Videos (`.mp4`, `.webm`)**: Renders case study clips using autoplaying, looping, and muted settings, behaving like high-definition, zero-lag GIFs.
* **Connected Chips Grid**: Shows a visual grid of adjacent nodes (collaborators, agencies, industry files), allowing you to jump through the career network.

---

## Hosted Remote MCP Server

The server exposes a Model Context Protocol endpoint at `GET /api/mcp` using the Server-Sent Events (SSE) transport protocol. For step-by-step instructions on setting up connections in local IDEs or CLI clients, see the [MCP Connection Guide](industry/mcp.md).

### Exposing Media to External AIs
When an external LLM client (like Claude Desktop) queries a project description, the Hono backend automatically translates relative media references (`../raw/media/`) in the markdown into **fully qualified public URLs** (e.g. `https://iaintait.com/wiki-media/...`). This enables modern AI clients that render markdown images to show your case study loop clips and images directly inside the user's chat window!

### Available Tools

| Tool Name | Parameters | Returns |
| :--- | :--- | :--- |
| `searchArchive` | `query: string` | JSON array of matching database node records (IDs, titles, kinds). |
| `getNodeDetails` | `id: string` | Complete node metadata and markdown body as a structured JSON object. |
| `getTimelineEras` | None | Chronological JSON array of all career eras, agencies, and roles. |

---

## System Dashboard & Tone Playground (`/system`)

Access the admin dashboard by clicking the `[ system login ]` link in the footer or navigating to `http://localhost:5173/system`.

1. **Open Knowledge Sync**: Click the manual sync trigger button to re-scan the markdown files and re-build your SQLite database in real-time (disabled in production environment).
2. **Diagnostics**: Checks for **orphan nodes** (nodes disconnected from the graph) and **dead links** (markdown files referencing files that do not exist), outputting a list of issues to fix in your markdown files.
3. **Agent Tone Playground**:
   * Select a curated agent intent route.
   * Edit the trigger keyphrase, simulated tool calls, or witty agent response markdown.
   * **Live Preview**: A side-by-side panel shows exactly how the tool execution logs and response will render, letting you preview typewriter animations and markdown spacing before saving.
   * Click **Commit Tone Update** to save changes back to `local.db`.

---

## How to Edit, Add, and Update

### 1. Adding a new Project or Profile
Simply create a new `.md` file inside the appropriate directory (`projects/`, `collaborators/`, `agencies/`, `industry/`).
* **Frontmatter template for projects**:
  ```markdown
  ---
  title: "Project Title"
  year: 2026
  client: "Client Name"
  agency: "google_creative_lab"
  role: "Executive Creative Director"
  tags: [emerging, campaign]
  source_urls: ["https://example.com"]
  ---
  # Project Title
  
  Body markdown...
  ```
* **Adding Media**: Reference images or videos inside the body using relative paths:
  `![Racer Video](../raw/media/google_racer/racer_case_study.mp4)`

* **Syncing**: Once the file is saved, open `/system` in the browser and hit **Trigger Manual DB Sync** (or run `npm run db:sync` in your terminal).

### 2. Fine-Tuning the Agent's Voice
You can customize or add new agent responses directly inside the **Tone Playground** on the `/system` admin dashboard. You can also seed new rules directly inside the `routes` array in [sync.ts](file:///Users/iaintait/Code/llm-wiki/server/db/sync.ts).

---

## Pipeline & Local Developer Commands

Initialize, run, and compile the workspace using these commands:

* **Install dependencies**:
  ```bash
  npm install
  ```
* **Start Development Servers (Concurrently)**:
  ```bash
  npm run dev
  ```
  Launches Vite frontend (`http://localhost:5173`) and Hono backend (`http://localhost:8787`).
* **Run Database Ingestion Sync**:
  ```bash
  npm run db:sync
  ```
  Parses all markdown files and re-compiles `local.db`.
* **Push Database Schema Updates**:
  ```bash
  npm run db:push
  ```
  Updates SQLite table structure when changing `schema.ts`.
* **Open Database GUI**:
  ```bash
  npm run db:studio
  ```
  Launches Drizzle Studio to browse nodes, edges, and agent routes in a web GUI.
* **Run Unit Tests**:
  ```bash
  npm run test
  ```
  Executes the Vitest API routes and SSE stream tests.
* **Compile Production Bundle**:
  ```bash
  npm run build
  ```
  Checks TypeScript types (`tsc --noEmit`) and packages static Vite files into `dist/`. Hono will serve these files automatically in production mode.

---

## Open Knowledge Format (OKF)

This project adheres to the **Open Knowledge Format (OKF)**, an open specification designed to standardize how organizational and career knowledge is stored for portability, durability, and AI readability.

### Core Principles
1. **Just Markdown**: All content is stored as plain markdown files, ensuring it is readable by humans in any editor, renderable on git hosts like GitHub, and easily queryable.
2. **Just Files**: The vault is a simple, directory-based folder tree. No complex database servers or proprietary runtimes are required to author content.
3. **YAML Frontmatter**: Files contain metadata blocks (e.g. `title`, `year`, `client`, `tags`) to provide structured context, allowing AI agents to classify nodes.
4. **Graph-Based Linking**: Nodes cross-link using standard markdown relative paths, generating a queryable knowledge graph.

---

## Production Deployment Flow (Google Cloud Run)

The site is designed to run in serverless container hosts like **Google Cloud Run** with zero database maintenance overhead.

### Build & Pre-Compilation
* **No Live DB Required**: In production, the SQLite database is built **during compilation**. The deployment pipeline runs `npm run db:sync` to parse the OKF markdown files and compile `local.db`.
* **Baked-in SQLite**: The `local.db` database is packaged directly inside the container image. The live Hono application serves queries from this local read-only database with sub-millisecond query latency.
* **Git-Driven Content updates**: To update content on the live site, simply edit the markdown files locally, commit them, and push them to Git to trigger a build. The `/system` dashboard automatically disables write options when running in a live container.
