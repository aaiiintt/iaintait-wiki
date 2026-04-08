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

const PROJECT_SLUGS = [
  'wk_nothing_beats_a_londoner',
  'wk_gillian_wearing_deepfake',
  'wk_three_phones_are_good',
  'wk_niantic_ingress_prime',
  'wk_sainsburys_nicholas_the_sweep',
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const readMd = (p) => {
  if (!fs.existsSync(p)) return null;
  return matter(fs.readFileSync(p, 'utf8'));
};

const wordCount = (s) => (s.match(/\b\w+\b/g) || []).length;

const extractCollabLinks = (body) => {
  // [Name](../collaborators/slug.md) — Role
  const re = /\[([^\]]+)\]\(\.\.\/collaborators\/([^)]+)\.md\)\s*(?:[—-]\s*([^\n]+))?/g;
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
  const words = wordCount(body);
  const { assets, refs } = countAssetsAndRefs(body);
  const richness = words + 50 * refs + 30 * assets;

  // Project description: first paragraph after first H2.
  const firstPara =
    body.split(/\n##\s+/).slice(1).join('\n##  ').match(/\n\n([^\n][^\n]+)/)?.[1] ||
    body.split('\n').find((l) => l.trim().length > 60) ||
    '';

  const projectId = `project:${slug}`;
  addNode({
    id: projectId,
    kind: 'project',
    title: fm.title || slug,
    year: fm.year ?? null,
    desc: firstPara.trim().slice(0, 320),
    body,
    richness,
    sourceUrls: fm.source_urls || [],
    client: fm.client || null,
    slug,
  });

  // Agency from frontmatter
  if (fm.agency) {
    const agSlug = fm.agency;
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
    });
    addEdge(projectId, cId, 'collab');
  }
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
