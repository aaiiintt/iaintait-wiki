---
name: llm-wiki-maintenance
description: Expert codebase maintenance, pre-flight auditing, and deployment playbook for the Personal Career Archive (llm-wiki).
---

# LLM Wiki Maintenance Playbook

Conventions and rules for maintaining, auditing, and upgrading this codebase.

## 1. Core Technology Stack
This is a unified TypeScript spoke application comprising:
*   **Frontend**: Vite + React 19 + Vanilla CSS (driven by shadcn/ui components in `src/`).
*   **Backend**: Hono server on Node.js (`server/`).
*   **Database**: SQLite via `@libsql/client` + Drizzle ORM (`server/db/`).
*   **Vector Search & Caching**: Two-tiered cache (exact match + vector semantic match via Vertex AI `text-embedding-004`) stored in Drizzle tables `query_cache`, `query_logs`, and `node_embeddings`.
*   **Model Context Protocol (MCP)**: Exposes a standardized SSE server at `/api/mcp`.

## 2. Nomenclature Rules
*   **Command Bar**: The control/search bar at the top of the interface is called the **Command Bar** (never Omnibar, Omnibox, or Command Palette).
*   **Tool Calls**: Under-the-hood agent database operations are referred to as **Tool Calls** (never System Calls, System Actions, or Terminal Actions).
*   **Execution Logs**: Detailed diagnostic steps displaying program executions are called **Execution Logs** or **Tool Execution Logs** (never Terminal Logs or Interrogation Logs).

## 3. Auditing Pre-flight Checklist
Before making changes live, the agent MUST run the following pre-flight verifications:
1.  **Typecheck Linter**: Run `npm run check` (typecheck must pass clean).
2.  **Unit Tests**: Run `npm run test` (Vitest endpoint tests must pass).
3.  **Graph Consistency**: Run `npm run db:sync` to generate new node embeddings, refresh database entries, and clear dynamic cached responses. Ensure no orphaned nodes or dead links exist.

## 4. Git & GitHub Usage
*   Commit changes to the active working branch.
*   Use present-tense, semantic commit logs (e.g. `Implement smart search caching` or `Fix imports in sync.ts`).
*   Verify branch sync status using `git status` and push with `git push origin <branch>`.

## 5. Deployment Workflow
*   Local builds and deployment are managed via `./deploy-local.sh`.
*   Docker platform platform target is `linux/amd64`.
*   Image pushes target Google Artifact Registry under the `aaiiintt` project namespace.
*   Deployments update the Cloud Run service `spoke-mcp` in `us-central1`.
*   **CRITICAL**: NEVER execute `./deploy-local.sh` or production Cloud Run deployment commands automatically without explicit user authorization in the current turn.
