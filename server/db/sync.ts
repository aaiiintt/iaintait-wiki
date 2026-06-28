import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { db } from "./index";
import { nodes, edges, agentRoutes, type NewNode, type NewEdge, type NewAgentRoute } from "./schema";

const WIKI_ROOT = path.resolve(process.cwd());

// Helper to slugify names/titles
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Helper to count words
function wordCount(s: string): number {
  return (s.match(/\b\w+\b/g) || []).length;
}

// Count media assets and reference links
function countAssetsAndRefs(body: string): { assets: number; refs: number } {
  const assets = (body.match(/!\[[^\]]*\]\(/g) || []).length;
  const refsBlock = body.split(/^##\s+References & Media/m)[1] || "";
  const refs = (refsBlock.match(/\bhttps?:\/\//g) || []).length;
  return { assets, refs };
}

// Extract linked collaborators: [Name](../collaborators/slug.md) — Role
function extractCollabLinks(body: string): Array<{ name: string; slug: string; role: string }> {
  const re = /\[([^\]]+)\]\((?:\.\.\/)+collaborators\/([^)]+)\.md\)\s*(?:[—-]\s*([^\n]+))?/g;
  const out: Array<{ name: string; slug: string; role: string }> = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({
      name: m[1]?.trim() || "",
      slug: m[2]?.trim() || "",
      role: m[3]?.trim() || "",
    });
  }
  return out;
}

// Extract plain collaborators: - **Name** — Role (no link)
function extractPlainCollabs(body: string): Array<{ name: string; slug: string; role: string }> {
  const splitSect = body.split(/^##\s+Collaborators\s*$/m);
  if (splitSect.length < 2) return [];
  const sect = splitSect[1];
  if (!sect) return [];
  const stop = sect.search(/^##\s+/m);
  const block = stop >= 0 ? sect.slice(0, stop) : sect;
  const out: Array<{ name: string; slug: string; role: string }> = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*-\s+\*\*([^*]+)\*\*\s*[—-]\s*(.+)$/);
    if (!m) continue;
    if (line.includes("../collaborators/")) continue; // already captured
    const name = m[1]?.trim() || "";
    out.push({
      name,
      slug: slugify(name),
      role: m[2]?.trim() || "",
    });
  }
  return out;
}

// Extract relative links for dynamic edges
function extractRelativeLinks(filePath: string, content: string): Array<{ text: string; relWiki: string }> {
  const re = /\[([^\]]+)\]\(([^)]+\.md)(#[^)]*)?\)/g;
  const out: Array<{ text: string; relWiki: string }> = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const text = m[1]?.trim() || "";
    const relPath = m[2]?.trim() || "";
    const absTarget = path.normalize(path.resolve(path.dirname(filePath), relPath));
    const relWiki = path.relative(WIKI_ROOT, absTarget);
    out.push({ text, relWiki });
  }
  return out;
}

// Map a relative markdown path to a target node ID
function getTargetNodeId(relWiki: string): string | null {
  const normalizedRel = relWiki.replace(/\\/g, "/");
  const parts = normalizedRel.split("/");
  if (parts.length < 2) return null;
  const dir = parts[0];
  const slug = parts.slice(1).join("/").slice(0, -3); // remove .md
  if (dir === "projects") return `project:${slug}`;
  if (dir === "collaborators") return `person:${slug}`;
  if (dir === "agencies") return `agency:${slug}`;
  if (dir === "industry") return `industry:${slug}`;
  return null;
}

// Map target ID to edge type
function getEdgeKind(targetId: string): "agency" | "collab" | "link" {
  if (targetId.startsWith("agency:")) return "agency";
  if (targetId.startsWith("person:")) return "collab";
  return "link";
}

// Standardize agency names to known agency slugs
function canonicalAgencySlug(raw: string): string {
  const s = String(raw).toLowerCase();
  if (s.includes("google")) return "google_creative_lab";
  if (s.includes("portland")) return "wieden_and_kennedy_portland";
  if (s.includes("wieden") && s.includes("london")) return "wieden_and_kennedy_london";
  if (s.includes("wieden")) return "wieden_and_kennedy_london";
  if (s.includes("poke")) return "poke_london";
  if (s.includes("food")) return "food";
  return slugify(s);
}

// Read markdown directory recursively
function walkDir(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(full, rel));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(rel.slice(0, -3));
    }
  }
  return out;
}

// Helper to enrich node body with video metadata from info.json if it exists
function enrichNodeBodyWithVideoMetadata(body: string): string {
  if (!body) return "";
  const mediaMatches = [...body.matchAll(/raw\/media\/(.*?)\.mp4/g)];
  if (mediaMatches.length === 0) return body;

  const uniqueSlugs = Array.from(new Set(mediaMatches.map(m => m[1])));
  let enrichedBody = body;
  for (const mediaSlug of uniqueSlugs) {
    const infoJsonPath = path.join(process.cwd(), "raw/media", `${mediaSlug}.info.json`);
    if (fs.existsSync(infoJsonPath)) {
      try {
        const jsonContent = fs.readFileSync(infoJsonPath, "utf8");
        const metadata = JSON.parse(jsonContent);
        
        const title = metadata.title || "";
        const desc = metadata.description || "";
        const duration = metadata.duration_string || (metadata.duration ? `${Math.floor(metadata.duration / 60)}m` : "");
        const uploadDate = metadata.upload_date ? `${metadata.upload_date.slice(0,4)}-${metadata.upload_date.slice(4,6)}-${metadata.upload_date.slice(6,8)}` : "";

        if (desc || title) {
          enrichedBody += `\n\n## Original Video Metadata & Description\n`;
          if (title) enrichedBody += `* **Original Video Title:** ${title}\n`;
          if (duration) enrichedBody += `* **Duration:** ${duration}\n`;
          if (uploadDate) enrichedBody += `* **Publish Date:** ${uploadDate}\n`;
          if (desc) {
            enrichedBody += `* **Original Video Description:**\n  > ${desc.replace(/\n/g, "\n  > ")}\n`;
          }
        }
      } catch (err) {
        console.error(`Failed to parse info.json at ${infoJsonPath}:`, err);
      }
    }
  }
  return enrichedBody;
}

// Main sync operation
export async function sync() {
  console.log("Starting Open Knowledge sync to SQLite...");

  const projectsDir = path.join(WIKI_ROOT, "projects");
  const collaboratorsDir = path.join(WIKI_ROOT, "collaborators");
  const agenciesDir = path.join(WIKI_ROOT, "agencies");
  const industryDir = path.join(WIKI_ROOT, "industry");

  const projectSlugs = walkDir(projectsDir);
  const collaboratorSlugs = walkDir(collaboratorsDir);
  const agencySlugs = walkDir(agenciesDir);
  const industrySlugs = walkDir(industryDir);

  const parsedNodes = new Map<string, NewNode>();
  const parsedEdges: NewEdge[] = [];

  const addNode = (node: NewNode) => {
    const existing = parsedNodes.get(node.id);
    if (existing) {
      if (node.richness !== undefined && node.richness > (existing.richness ?? 0)) existing.richness = node.richness;
      if (node.hasProfile && !existing.hasProfile) existing.hasProfile = 1;
      if (node.body && (!existing.body || node.body.length > existing.body.length)) existing.body = node.body;
      if (node.title && (!existing.title || node.title.length > existing.title.length)) existing.title = node.title;
    } else {
      parsedNodes.set(node.id, node);
    }
  };

  const addEdge = (source: string, target: string, kind: "agency" | "collab" | "link") => {
    if (source === target) return;
    parsedEdges.push({ source, target, kind });
  };

  // 1. Process Projects
  for (const slug of projectSlugs) {
    const filePath = path.join(projectsDir, `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = matter(fileContent);
    const fm = parsed.data || {};
    const body = parsed.content;

    const isConfidential = slug.startsWith("confidential/") || !!fm.confidential;
    const words = wordCount(body);
    const { assets, refs } = countAssetsAndRefs(body);
    const richness = isConfidential ? 30 : words + 50 * refs + 30 * assets;

    const firstPara =
      body.split(/\n##\s+/).slice(1).join("\n##  ").match(/\n\n([^\n][^\n]+)/)?.[1] ||
      body.split("\n").find((l) => l.trim().length > 60) ||
      "";

    const projectId = `project:${slug}`;
    addNode({
      id: projectId,
      kind: "project",
      title: fm.title || slug,
      year: fm.year || null,
      desc: firstPara.trim().slice(0, 320),
      body: enrichNodeBodyWithVideoMetadata(body),
      richness,
      sourceUrls: JSON.stringify(fm.source_urls || []),
      client: fm.client || null,
      role: fm.role || null,
      slug,
      confidential: isConfidential ? 1 : 0,
      hasProfile: 0,
    });

    // Link Agency
    if (fm.agency) {
      const agSlug = canonicalAgencySlug(fm.agency);
      const agId = `agency:${agSlug}`;
      const agencyFile = path.join(agenciesDir, `${agSlug}.md`);
      let agTitle = fm.agency;
      let agBody = "";
      let agRichness = 100;
      if (fs.existsSync(agencyFile)) {
        const agParsed = matter(fs.readFileSync(agencyFile, "utf8"));
        agTitle = agParsed.data.title || agTitle;
        agBody = agParsed.content;
        agRichness = wordCount(agBody);
      }
      addNode({
        id: agId,
        kind: "agency",
        title: agTitle,
        body: agBody,
        richness: agRichness,
        slug: agSlug,
      });
      addEdge(projectId, agId, "agency");
    }

    // Link Collaborators (Markdown Links)
    const linkedCollabs = extractCollabLinks(body);
    for (const col of linkedCollabs) {
      const colId = `person:${col.slug}`;
      const colFile = path.join(collaboratorsDir, `${col.slug}.md`);
      let colBody = "";
      let colRichness = 50;
      let hasProf = 0;
      if (fs.existsSync(colFile)) {
        const colParsed = matter(fs.readFileSync(colFile, "utf8"));
        colBody = colParsed.content;
        colRichness = wordCount(colBody);
        hasProf = 1;
      }
      addNode({
        id: colId,
        kind: "person",
        title: col.name,
        role: col.role || null,
        body: colBody,
        richness: colRichness,
        hasProfile: hasProf,
        slug: col.slug,
      });
      addEdge(projectId, colId, "collab");
    }

    // Link Collaborators (Plain Text)
    const plainCollabs = extractPlainCollabs(body);
    for (const col of plainCollabs) {
      const colId = `person:${col.slug}`;
      addNode({
        id: colId,
        kind: "person",
        title: col.name,
        role: col.role || null,
        richness: 40,
        hasProfile: 0,
        slug: col.slug,
      });
      addEdge(projectId, colId, "collab");
    }
  }

  // 2. Process Collaborators Profiles
  for (const slug of collaboratorSlugs) {
    const filePath = path.join(collaboratorsDir, `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = matter(fileContent);
    const fm = parsed.data || {};
    const body = parsed.content;

    const colId = `person:${slug}`;
    addNode({
      id: colId,
      kind: "person",
      title: fm.title || slug,
      body,
      richness: wordCount(body),
      hasProfile: 1,
      slug,
    });
  }

  // 3. Process Agencies Profiles
  for (const slug of agencySlugs) {
    const filePath = path.join(agenciesDir, `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = matter(fileContent);
    const fm = parsed.data || {};
    const body = parsed.content;

    const agId = `agency:${slug}`;
    addNode({
      id: agId,
      kind: "agency",
      title: fm.title || slug,
      body,
      richness: wordCount(body),
      slug,
    });
  }

  // 4. Process Industry Files
  for (const slug of industrySlugs) {
    const filePath = path.join(industryDir, `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = matter(fileContent);
    const fm = parsed.data || {};
    const body = parsed.content;

    const words = wordCount(body);
    const { assets, refs } = countAssetsAndRefs(body);
    const richness = words + 50 * refs + 30 * assets;
    const indId = `industry:${slug}`;

    const firstPara =
      body.split("\n").find((l) => l.trim().length > 60) || "";

    addNode({
      id: indId,
      kind: "industry",
      title: fm.title || slug,
      year: fm.year || null,
      desc: firstPara.trim().slice(0, 320),
      body: enrichNodeBodyWithVideoMetadata(body),
      richness,
      sourceUrls: JSON.stringify(fm.source_urls || []),
      slug,
    });
  }

  // 4.5. Process Root README.md as system documentation node
  const readmePath = path.join(WIKI_ROOT, "README.md");
  if (fs.existsSync(readmePath)) {
    const fileContent = fs.readFileSync(readmePath, "utf8");
    const parsed = matter(fileContent);
    const fm = parsed.data || {};
    const body = parsed.content;

    const words = wordCount(body);
    const { assets, refs } = countAssetsAndRefs(body);
    const richness = words + 50 * refs + 30 * assets;
    const readmeId = "readme:about";

    const firstPara =
      body.split("\n").find((l) => l.trim().length > 60 && !l.trim().startsWith("#")) || "";

    addNode({
      id: readmeId,
      kind: "about",
      title: fm.title || "README: Career Archive & Remote MCP Server",
      year: fm.year || null,
      desc: firstPara.trim().slice(0, 320),
      body: body,
      richness,
      sourceUrls: JSON.stringify(fm.source_urls || []),
      slug: "readme",
    });
  }

  // 5. Scan Markdown bodies for cross-links to make dynamic edges
  for (const node of parsedNodes.values()) {
    if (!node.body) continue;
    let filePath = "";
    if (node.kind === "project") {
      filePath = path.join(projectsDir, `${node.slug}.md`);
    } else if (node.kind === "person" && node.hasProfile) {
      filePath = path.join(collaboratorsDir, `${node.slug}.md`);
    } else if (node.kind === "agency") {
      filePath = path.join(agenciesDir, `${node.slug}.md`);
    } else if (node.kind === "industry") {
      filePath = path.join(industryDir, `${node.slug}.md`);
    } else if (node.kind === "about") {
      filePath = path.join(WIKI_ROOT, "README.md");
    }

    if (!filePath || !fs.existsSync(filePath)) continue;

    const links = extractRelativeLinks(filePath, node.body);
    for (const link of links) {
      const targetId = getTargetNodeId(link.relWiki);
      if (targetId && parsedNodes.has(targetId)) {
        addEdge(node.id, targetId, getEdgeKind(targetId));
      }
    }
  }

  // Deduplicate edges
  const seenEdges = new Set<string>();
  const finalEdges: NewEdge[] = [];
  for (const edge of parsedEdges) {
    const k = `${edge.source}|${edge.target}|${edge.kind}`;
    const rk = `${edge.target}|${edge.source}|${edge.kind}`;
    if (seenEdges.has(k) || seenEdges.has(rk)) continue;
    seenEdges.add(k);
    finalEdges.push(edge);
  }

  // 6. DB Operations: Delete existing & Insert
  await db.transaction(async (tx) => {
    await tx.delete(nodes);
    await tx.delete(edges);

    console.log(`Inserting ${parsedNodes.size} nodes into database...`);
    const nodesArray = Array.from(parsedNodes.values());
    // Insert in batches of 100 to avoid sqlite limits
    for (let i = 0; i < nodesArray.length; i += 100) {
      await tx.insert(nodes).values(nodesArray.slice(i, i + 100));
    }

    console.log(`Inserting ${finalEdges.length} edges into database...`);
    for (let i = 0; i < finalEdges.length; i += 100) {
      await tx.insert(edges).values(finalEdges.slice(i, i + 100));
    }
  });

  console.log("Database Node & Edge sync complete!");

  // 7. Seed Agent Routes
  console.log("Seeding Agent Intent Routes...");
  await seedAgentRoutes();

  console.log("Open Knowledge Ingestion Sync completed successfully!");
}

// Seed the Agent Intent Routes matching the current classifier intents
async function seedAgentRoutes() {
  const routes: NewAgentRoute[] = [
    {
      keyphrase: "hire_faq",
      simulatedStepsJson: JSON.stringify({
        system: "Interrogation Console v1.0.5",
        actions: [
          { step: "Intercept Hiring Intent", matched_keywords: ["hire", "cv", "salary", "availability", "pricing", "cost"] },
          { step: "Read FAQ Database File", path: "industry/faq.md" }
        ]
      }),
      agentResponseMarkdown: `### Professional Availability & Engagement Terms

For complete details on availability, pricing, and ways of working with Iain and the consultancy, please refer to the main **[FAQ](file:///industry/faq.md)** document.

Here is a summary of the consultancy's commercial parameters:

* **Current Focus:** Partner at **[FOOD](file:///agencies/food.md)**, focusing on helping brands figure out what AI means for creativity and applying it to modern marketing tasks.
* **Locations:** Unit 1, 36-42 New Inn Yard, London and 277 Grand St, 3rd Floor, New York. We work remotely but love collaborating from our physical studios.
* **Engagement Models:** We offer everything from two-week intense sprints and three-month prototyping labs to ongoing retainers and equity-sharing joint ventures.
* **Day Rate:** Depends entirely on the specific assignment and scope.
* **Pitching Policy:** We do not pitch. As a lean consultancy, we do not do unpaid pitches. We happily meet to see if we gel creatively, or start with a paid "taster" project to test the relationship.
* **Enquiry Channels:**
  * *To pay us to work (Clients)*: [gravy@food.xyz](mailto:gravy@food.xyz)
  * *To work for us (Careers)*: [cook@food.xyz](mailto:cook@food.xyz)
  * *Press / Speaking*: [dinner@food.xyz](mailto:dinner@food.xyz)
  * *Request credentials*: [creds@food.xyz](mailto:creds@food.xyz)`,
      targetProjectSlug: "food"
    },
    {
      keyphrase: "collaborators",
      simulatedStepsJson: JSON.stringify({
        system: "Interrogation Console v1.0.5",
        actions: [
          { step: "Identify Collaborator Relations", subject: "Tait, Iain" },
          { step: "Score Connections", relations: ["Nick Farnhill", "Nik Roope", "Richard Turley", "Matt Clark"] }
        ]
      }),
      agentResponseMarkdown: `### Key Collaborators & Partners

No great work is done in isolation, and Iain's career is defined by a tight-knit network of world-class collaborators. Let me introduce you to the core syndicate:

* **[Nick Farnhill](file:///collaborators/nick_farnhill.md) — The Business Partner:**
  * *Who he is:* The executive CEO partner of Iain's creative ventures. Co-founded POKE in 2001 and co-founded **[FOOD](file:///agencies/food.md)** in 2021. The business and operational anchor.
* **[Richard Turley](file:///collaborators/richard_turley.md) — The Visual Rebel:**
  * *Who he is:* Legendary designer (Bloomberg Businessweek, MTV). Partner at **[FOOD](file:///agencies/food.md)**, bringing visual disruption and graphic design excellence to the consultancy.
* **[Matt Clark](file:///collaborators/matt_clark.md) — The Creative Partner:**
  * *Who he is:* Creative entrepreneur and partner at **[FOOD](file:///agencies/food.md)**, as well as a partner at Mother and Mother Ventures. He has been a key business adviser and early supporter of POKE since its foundational years.
* **[Nik Roope](file:///collaborators/nik_roope.md) — The Design Pioneer:**
  * *Who he is:* POKE co-founder, conceptual designer, and the mastermind behind the Arduino-powered **[Baker Tweet](file:///projects/poke_baker_tweet.md)** box.

Select a collaborator link to examine their profile, or query another term.`,
      targetProjectSlug: "food"
    },
    {
      keyphrase: "key_campaigns",
      simulatedStepsJson: JSON.stringify({
        system: "Interrogation Console v1.0.5",
        actions: [
          { step: "Query Iconic Projects", filter: "Cannes Grand Prix OR HTML5 Parallax" },
          { step: "Compile Portfolio Highlights", items: ["Old Spice Responses", "Nike Better World", "Baker Tweet", "Google Racer"] }
        ]
      }),
      agentResponseMarkdown: `### Key Campaigns & Iconic Projects

Iain's portfolio is filled with award-winning digital innovations, industry-firsts, and cultural milestones:

* **[Old Spice "Responses"](file:///projects/wk_old_spice_responses.md) (2010):** The fastest-growing interactive real-time campaign in history, winning the Cannes Lions Cyber Grand Prix.
* **[Nike Better World](file:///projects/wk_nike_better_world.md) (2011):** The pioneering HTML5 parallax scroll project that redefined web layouts.
* **[Baker Tweet](file:///projects/poke_baker_tweet.md) (2009):** A custom Arduino-powered terminal for bakeries to tweet when bread is fresh.
* **[Google Racer](file:///projects/google_racer.md) (2013):** A multi-screen mobile slot-car racing game showcasing early WebSockets.
* **[The Warholiser](file:///projects/poke_warholiser.md) (2002):** A digital kiosk at Tate Modern that turned visitors into Warhol prints.
* **[Coke Polar Bowl](file:///projects/wk_coca_cola_polar_bowl.md) (2012):** A live Super Bowl second-screen campaign.
* **[Nothing Beats a Londoner](file:///projects/wk_nothing_beats_a_londoner.md) (2018):** A legendary London youth culture film for Nike.
* **[Room 10101](file:///projects/poke_room_10101.md) (2004):** An interactive installation for Nokia.

Select one of the project links to view their full details, or click a suggested search chip below.`,
      targetProjectSlug: "wk_old_spice_responses"
    },
    {
      keyphrase: "creative_philosophy",
      simulatedStepsJson: JSON.stringify({
        system: "Interrogation Console v1.0.5",
        actions: [
          { step: "Query Core Beliefs", filter: "AI OR emerging tech OR views" },
          { step: "Synthesize Philosophy", concepts: ["Human-centric tech", "Playfulness", "Emergent Media"] }
        ]
      }),
      agentResponseMarkdown: `### Creative Philosophy: Technology & AI

Iain's work is driven by a unique philosophy: that technology should be human, accessible, and playful. He has been at the forefront of emerging tech for over two decades:

* **Real-time & Artificial Intelligence:** From the live propaganda war of **[Ingress Prime](file:///projects/wk_niantic_ingress_prime.md)** in 2018 to consulting on AI models today, Iain views AI as a collaborative creative tool.
* **Emergent Media:** Building slot-car racing games using WebSockets (**[Google Racer](file:///projects/google_racer.md)**) or early AR campaigns (**[Oasis Rubberduckzilla](file:///projects/poke_rubberduckzilla.md)**) to prove what new tech can do before it becomes mainstream.
* **Psychology of Digital:** Rooted in his psychology degree from Edinburgh University, Iain approaches design with an understanding of human behavior, community interaction, and cultural play.`,
      targetProjectSlug: "wk_niantic_ingress_prime"
    },
    {
      keyphrase: "career_overview",
      simulatedStepsJson: JSON.stringify({
        system: "Interrogation Console v1.0.5",
        actions: [
          { step: "Query Agency Graph", query: "SELECT title, location, duration FROM agencies ORDER BY start_date;" },
          { step: "Map Location Hops", locations: ["Edinburgh", "London", "Portland", "New York"] }
        ]
      }),
      agentResponseMarkdown: `### Agency & Geographic Hops

Iain's career spans three major creative capitals. Let's map them out so you don't get lost:

* **[POKE London](file:///agencies/poke_london.md) (2001-2010) — The Shoreditch Indie Era:**
  * *The Vibe:* Co-founding a digital agency in the basement of Mother London right after the dotcom crash. Scrappy, experimental, making connected toasters and infinite web pages.
* **[W+K Portland](file:///agencies/wieden_and_kennedy_portland.md) (2010-2012) — The Oregon Gold Rush:**
  * *The Vibe:* Global Interactive ECD and W+K Partner. Running massive accounts like Old Spice and Coca-Cola, converting real-time social responses into global case studies.
* **[Google Creative Lab](file:///agencies/google_creative_lab.md) (2012-2014) — The NYC Sandbox:**
  * *The Vibe:* ECD role. Playing with early Chrome technology, WebSockets, and connected hardware. Resulted in slot-car phone games and patents.
* **[W+K London](file:///agencies/wieden_and_kennedy_london.md) (2014-2021) — The ECD Return:**
  * *The Vibe:* Running the creative department of W+K London for 7 years. Highlights include Nike, Formula 1, and AI story experiments for Niantic.
* **[FOOD](file:///agencies/food.md) (2021-Present) — The Global Boutique (London & NY):**
  * *The Vibe:* Back to independent boutique life. Co-founding FOOD to consult on AI with Google and build spatial AR murals.

Select one of the agency links to view their projects, or click one of the suggested search chips below.`,
      targetProjectSlug: "food"
    },
    {
      keyphrase: "talks",
      simulatedStepsJson: JSON.stringify({
        system: "Interrogation Console v1.0.5",
        actions: [
          { step: "Scan Transcripts", query: "SELECT title, location, year FROM talks ORDER BY year;" },
          { step: "Status", records_found: 8 }
        ]
      }),
      agentResponseMarkdown: `### Public Speaking & Keynotes

Iain has keynoted at major creative and technology festivals globally, focusing on playfulness, emergent digital culture, and why interactive design matters:

* **[Cannes Lions Cyber Jury President Speech](file:///industry/talks/cannes_cyber_lions_jury_president.md)** (Cannes, 2012)
* **[D&AD Foreman Keynote: I Wish I'd Done That](file:///industry/talks/dandad_i_wish_id_done_that.md)** (London, 2013)
* **[Offset Keynote](file:///industry/talks/offset_2013.md)** (Dublin, 2013)
* **[Playful London Keynote: High Scores](file:///industry/talks/playful_london_high_scores.md)** (London, 2009)
* **[Here London Keynote](file:///industry/talks/here_london_2015.md)** (London, 2015)
* **[PSFK Keynote: 10 Reasons Digital is Better](file:///industry/talks/psfk_10_reasons_digital.md)** (New York, 2010)
* **[Radiohead Marketing Talk](file:///industry/talks/radiohead_marketing.md)** (London, 2008)
* **[Under The Influence Keynote](file:///industry/talks/under_the_influence.md)** (Cardiff, 2013)

For an overview of panels and podcasts, see **[Podcasts & Speaking](file:///industry/podcasts_and_speaking.md)**.`,
      targetProjectSlug: "podcasts_and_speaking"
    }
  ];

  // Insert seed routes
  await db.transaction(async (tx) => {
    await tx.delete(agentRoutes);
    for (const r of routes) {
      await tx.insert(agentRoutes).values(r);
    }
  });
  console.log(`Successfully seeded ${routes.length} Agent Intent Routes!`);
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Sync failed:", err);
      process.exit(1);
    });
}

import { fileURLToPath } from "node:url";
