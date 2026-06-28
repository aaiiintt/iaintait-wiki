---
title: "MCP Server Connection Guide"
type: "industry"
tags: [mcp, developer, tools, integration]
aliases: ["MCP Connection Guide", "Model Context Protocol", "Connect to MCP"]
source_urls: ["https://modelcontextprotocol.io"]
---

# MCP Server Connection Guide

The Iain Tait Career Archive exposes its complete dataset—including 25 years of project history, collaborative connections, patents, speaking engagements, and timeline nodes—via a hosted Model Context Protocol (MCP) server. 

By connecting your local AI agent or editor (like Claude Desktop or Cursor) to this server, your AI client can directly search, traverse, and query the archive.

---

## Connection Specifications

The server implements the Model Context Protocol over the **Server-Sent Events (SSE)** transport protocol.

* **SSE Endpoint**: `http://localhost:8787/api/mcp`
* **Transport**: HTTP POST (client to server) and Server-Sent Events (server to client)

---

## Client Integration Configurations

### 1. Claude Code
To connect Claude Code (CLI agent) to the archive, mount the SSE client wrapper directly by running the following command:

```bash
claude mcp add mcp-aaiiintt npx -y @modelcontextprotocol/client-sse http://localhost:8787/api/mcp
```

### 2. Antigravity (anti-gravity)
To connect the Google Antigravity developer environment, open your global settings file:
* **Settings Path**: `~/.gemini/config/settings.json`

Add the `mcp-aaiiintt` server definition inside the `mcpServers` object:

```json
{
  "mcpServers": {
    "mcp-aaiiintt": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-sse",
        "http://localhost:8787/api/mcp"
      ]
    }
  }
}
```

### 3. Cursor
To connect the Cursor editor:
1. Navigate to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the configuration details:
   * **Name**: `mcp-aaiiintt`
   * **Type**: `SSE`
   * **URL**: `http://localhost:8787/api/mcp`
4. Click **Save**.

---

## Exposed Tools Catalog

Once connected, your AI client has access to the following programmatic tools to query the career archive:

| Tool Name | Input Parameters | Return Content |
| :--- | :--- | :--- |
| `searchArchive` | `query: string` | JSON array of matching database node records (IDs, titles, kinds). |
| `getNodeDetails` | `id: string` | Complete node metadata and markdown body as a structured JSON object. |
| `getTimelineEras` | None | Chronological JSON array of all career eras, agencies, and roles. |

---

## Media Asset Translation Spec
When tools return project data, the Hono backend automatically translates relative asset links (e.g. `../raw/media/...`) into fully qualified local server URLs (`http://localhost:8787/wiki-media/...`). If your external LLM client supports rendering inline markdown images, loop videos, and case study clips will automatically play inside your chat window.
