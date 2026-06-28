---
title: "About This Site"
type: "industry"
tags: [architecture, tech-stack, mcp, database]
aliases: ["About This Site", "Site Architecture", "How This Site Works"]
year: 2026
---

# About This Site

This site is an experiment in agent-grounded professional archiving. 

Instead of a traditional portfolio of statically rendered web pages, it is structured as an **Open Knowledge Graph**—a local SQLite database compiling 25 years of campaigns, patents, collaborations, and tenures, fully linked and queryable.

---

## The Architecture

The system is built to serve two distinct surfaces using a minimal, lightweight setup:

### 1. The Compilation-Phase Database
The SQLite database is built during the container compilation phase from raw markdown files. By packaging the database within the container itself:
* The application requires zero connection pools, external databases, or heavy cloud dependencies.
* Search queries and graph traversals resolve in sub-milliseconds.

### 2. Dual-Surface Interface
* **The Command Bar**: A unified conversational interface at the top of the screen. Under the hood, user queries are evaluated by an LLM (Gemini) grounded in real-time SQLite tool calls (`searchArchive`, `getNodeDetails`, `getTimelineEras`).
* **Model Context Protocol (MCP)**: The site exposes its underlying SQLite archive via a public HTTP Model Context Protocol (MCP) server using the Server-Sent Events (SSE) transport protocol. This allows external AI models (like Claude or Cursor) to read and traverse this career graph directly.

---

## The Potential

This is a prototype for the future of personal and professional websites. As web traversal shifts from human browsing to agent-assisted discovery, portfolios must adapt to become queryable databases. By structuring the archive in the Open Knowledge Format, this site enables machines to query, synthesize, and report on Iain's work with absolute factual grounding.
