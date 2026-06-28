import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { mcpRoute } from "./routes/mcp";
import { searchRoute } from "./routes/search";
import { nodesRoute } from "./routes/nodes";
import { systemRoute } from "./routes/system";
import { autocompleteRoute } from "./routes/autocomplete";
import path from "node:path";
import fs from "node:fs";

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Request logging
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[${c.req.method}] ${c.req.url} - ${c.res.status} (${ms}ms)`);
});

// API Routes mounting
app.route("/api/mcp", mcpRoute);
app.route("/api/search", searchRoute);
app.route("/api/nodes", nodesRoute);
app.route("/api/system", systemRoute);
app.route("/api/autocomplete", autocompleteRoute);

// Helper to dynamically resolve static file paths (e.g. mapping google_racer.gif to 2013_google_racer.gif)
function fuzzyResolvePath(p: string, prefixToRemove: string, rootFolder: string): string {
  const relativePath = p.replace(new RegExp(`^\\${prefixToRemove}`), "");
  const fullLocalPath = path.join(process.cwd(), rootFolder, relativePath);
  
  if (fs.existsSync(fullLocalPath)) {
    return relativePath;
  }
  
  try {
    const dir = path.dirname(relativePath);
    const file = path.basename(relativePath);
    const fullDir = path.join(process.cwd(), rootFolder, dir);
    
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir);
      const matchedFile = files.find(f => {
        const cleanF = f.replace(/^\d{4}_/, "");
        const cleanFile = file.replace(/^\d{4}_/, "");
        return f.toLowerCase() === file.toLowerCase() || 
               cleanF.toLowerCase() === cleanFile.toLowerCase() ||
               f.toLowerCase().endsWith(file.toLowerCase());
      });
      
      if (matchedFile) {
        return path.join(dir, matchedFile);
      }
    }
  } catch (err) {
    console.error(`Fuzzy path resolution failed for ${p}:`, err);
  }
  
  return relativePath;
}

// Media and asset static mounts
app.use(
  "/wiki-media/*",
  serveStatic({
    root: "./raw/media",
    rewriteRequestPath: (p) => fuzzyResolvePath(p, "/wiki-media", "raw/media"),
  })
);

app.use(
  "/wiki-assets/*",
  serveStatic({
    root: "./raw/assets",
    rewriteRequestPath: (p) => fuzzyResolvePath(p, "/wiki-assets", "raw/assets"),
  })
);

// Serve Vite frontend in production
if (process.env.NODE_ENV === "production") {
  // Serve static assets in dist
  app.use(
    "/*",
    serveStatic({
      root: "./dist",
    })
  );

  // Fallback for single-page client-side router
  app.get("*", async (c) => {
    const indexPath = path.resolve("./dist/index.html");
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, "utf8"));
    }
    return c.text("Production index.html not found", 404);
  });
}

// Start Hono Node Server
const port = Number(process.env.PORT || 8787);
console.log(`Hono API Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
