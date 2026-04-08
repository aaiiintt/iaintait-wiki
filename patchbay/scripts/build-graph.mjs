#!/usr/bin/env node
// Build patchbay/public/graph.json from real wiki markdown.
// Global entity identity: one node per project, agency, person.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIKI = path.resolve(__dirname, '../..');
const OUT = path.resolve(__dirname, '../public/graph.json');

// Auto-discover every project markdown file under wiki/projects/ (recursively).
// Slug = path relative to projects/, without .md extension. Subdirs (e.g.
// "confidential/foo") become part of the slug.
function discoverProjectSlugs() {
  const root = path.join(WIKI, 'projects');
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const base = entry.name.slice(0, -3);
        out.push(prefix ? `${prefix}/${base}` : base);
      }
    }
  };
  walk(root, '');
  return out.sort();
}
const PROJECT_SLUGS = discoverProjectSlugs();

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const readMd = (p) => {
  if (!fs.existsSync(p)) return null;
  return matter(fs.readFileSync(p, 'utf8'));
};

const wordCount = (s) => (s.match(/\b\w+\b/g) || []).length;

// For confidential projects, only expose the ## Overview section body.
const extractOverview = (body) => {
  const m = body.match(/##\s+Overview\s*\n([\s\S]*?)(?=\n##\s+|$)/);
  return m ? `## Overview\n\n${m[1].trim()}` : '';
};

const extractCollabLinks = (body) => {
  // [Name](../collaborators/slug.md) — Role
  const re = /\[([^\]]+)\]\((?:\.\.\/)+collaborators\/([^)]+)\.md\)\s*(?:[—-]\s*([^\n]+))?/g;
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ name: m[1].trim(), slug: m[2].trim(), role: (m[3] || '').trim() });
  }
  return out;
};

// Plain-text collaborators in the ## Collaborators section that don't link to a page.
const extractPlainCollabs = (body) => {
  const sect = body.split(/^##\s+Collaborators\s*$/m)[1];
  if (!sect) return [];
  const stop = sect.search(/^##\s+/m);
  const block = stop >= 0 ? sect.slice(0, stop) : sect;
  const out = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*-\s+\*\*([^*]+)\*\*\s*[—-]\s*(.+)$/);
    if (!m) continue;
    if (line.includes('../collaborators/')) continue; // already captured
    out.push({ name: m[1].trim(), slug: slugify(m[1]), role: m[2].trim() });
  }
  return out;
};

const countAssetsAndRefs = (body) => {
  const assets = (body.match(/!\[[^\]]*\]\(/g) || []).length;
  const refsBlock = body.split(/^##\s+References & Media/m)[1] || '';
  const refs = (refsBlock.match(/\bhttps?:\/\//g) || []).length;
  return { assets, refs };
};

const nodes = new Map(); // id -> node
const edges = [];

const addNode = (n) => {
  const existing = nodes.get(n.id);
  if (existing) {
    if ((n.richness ?? 0) > (existing.richness ?? 0)) existing.richness = n.richness;
    if (n.hasProfile && !existing.hasProfile) existing.hasProfile = true;
    if (n.body && (!existing.body || n.body.length > (existing.body?.length ?? 0))) existing.body = n.body;
    if (n.title && (!existing.title || n.title.length > existing.title.length)) existing.title = n.title;
    return existing;
  }
  nodes.set(n.id, n);
  return n;
};

const addEdge = (source, target, kind) => {
  edges.push({ source, target, kind });
};

for (const slug of PROJECT_SLUGS) {
  const file = path.join(WIKI, 'projects', `${slug}.md`);
  const parsed = readMd(file);
  if (!parsed) {
    console.warn(`missing project: ${file}`);
    continue;
  }
  const fm = parsed.data || {};
  const body = parsed.content;
  const isConfidential = slug.startsWith('confidential/') || !!fm.confidential;
  const safeBody = isConfidential ? extractOverview(body) : body;
  const words = wordCount(safeBody);
  const { assets, refs } = countAssetsAndRefs(safeBody);
  // Confidential projects get a fixed baseline richness so they don't render tiny.
  const richness = isConfidential ? 30 : words + 50 * refs + 30 * assets;

  const projectId = `project:${slug}`;
  // Project description: first paragraph after first H2.
  const firstParaSource = isConfidential ? safeBody : body;
  const firstPara =
    firstParaSource.split(/\n##\s+/).slice(1).join('\n##  ').match(/\n\n([^\n][^\n]+)/)?.[1] ||
    firstParaSource.split('\n').find((l) => l.trim().length > 60) ||
    '';

  addNode({
    id: projectId,
    kind: 'project',
    title: fm.title || slug,
    year: fm.year ?? null,
    desc: firstPara.trim().slice(0, 320),
    body: safeBody,
    richness,
    sourceUrls: fm.source_urls || [],
    client: fm.client || null,
    slug,
    ...(isConfidential && { confidential: true }),
  });

  // Agency from frontmatter — normalize free-text labels to canonical slugs
  // so e.g. "Google Creative Lab, New York" and "google_creative_lab" collapse
  // to one node.
  if (fm.agency) {
    const agSlug = canonicalAgencySlug(fm.agency);
    const agencyFile = path.join(WIKI, 'agencies', `${agSlug}.md`);
    const ag = readMd(agencyFile);
    const agId = `agency:${agSlug}`;
    addNode({
      id: agId,
      kind: 'agency',
      title: (ag?.data?.title) || (ag ? extractH1(ag.content) : prettify(agSlug)),
      body: ag?.content || '',
      richness: ag ? wordCount(ag.content) : 200,
    });
    addEdge(projectId, agId, 'agency');
  }

  // Linked collaborators
  const linked = extractCollabLinks(body);
  for (const c of linked) {
    const cFile = path.join(WIKI, 'collaborators', `${c.slug}.md`);
    const cMd = readMd(cFile);
    const cId = `person:${c.slug}`;
    addNode({
      id: cId,
      kind: 'person',
      title: cMd?.data?.title || c.name,
      role: c.role || null,
      body: cMd?.content || '',
      richness: cMd ? wordCount(cMd.content) : 60,
      hasProfile: !!cMd,
    });
    addEdge(projectId, cId, 'collab');
  }

  // Plain-text collaborators (no profile page) — still global by slug
  const plain = extractPlainCollabs(body);
  for (const c of plain) {
    const cId = `person:${c.slug}`;
    addNode({
      id: cId,
      kind: 'person',
      title: c.name,
      role: c.role || null,
      richness: 40,
      hasProfile: false,
    });
    addEdge(projectId, cId, 'collab');
  }
}

function canonicalAgencySlug(raw) {
  const s = String(raw).toLowerCase();
  if (s.includes('google')) return 'google_creative_lab';
  if (s.includes('portland')) return 'wieden_and_kennedy_portland';
  if (s.includes('wieden') && s.includes('london')) return 'wieden_and_kennedy_london';
  if (s.includes('wieden')) return 'wieden_and_kennedy_london';
  if (s.includes('poke')) return 'poke_london';
  if (s.includes('food')) return 'food';
  // Already a slug-like string — pass through.
  return slugify(s);
}

function extractH1(s) {
  const m = s.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}
function prettify(slug) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Iain is always present — load his profile directly so he exists even if a
// project page forgot to link him.
{
  const iainFile = path.join(WIKI, 'collaborators', 'iain_tait.md');
  const md = readMd(iainFile);
  if (md) {
    addNode({
      id: 'person:iain_tait',
      kind: 'person',
      title: md.data?.title || 'Iain Tait',
      role: md.data?.role || 'ECD',
      body: md.content,
      richness: wordCount(md.content),
      hasProfile: true,
    });
  }
}

// Dedupe edges (project + target + kind)
const seen = new Set();
const dedup = [];
for (const e of edges) {
  const k = `${e.source}|${e.target}|${e.kind}`;
  if (seen.has(k)) continue;
  seen.add(k);
  dedup.push(e);
}

const out = { nodes: [...nodes.values()], edges: dedup };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

const counts = out.nodes.reduce((a, n) => ((a[n.kind] = (a[n.kind] || 0) + 1), a), {});
console.log(`wrote ${OUT}`);
console.log(`  ${out.nodes.length} nodes (${JSON.stringify(counts)})`);
console.log(`  ${out.edges.length} edges`);
