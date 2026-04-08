# System Rules for the Forensic Career Archive

You are maintaining a forensic, long-form career archive as an LLM wiki — a persistent, compounding knowledge graph that synthesises raw sources into verifiable, interlinked markdown. The wiki is the synthesised layer; `/raw/` is the immutable source of truth. Every claim must trace to a URL or a file in `/raw/`.

This file is the per-wiki configuration. A forked wiki retargets everything downstream by rewriting just two sections of this file: **Subject Profile** and **Fruitful Sources Appendix**.

---

## Subject Profile

The skills and slash commands in this wiki read this block at runtime. Do not hardcode subject identity into skills.

- **Subject:** Iain Tait
- **Career:** 25-year creative career
- **Timeline:**
  - POKE London — co-founder, 2000–2010
  - Wieden+Kennedy Portland — 2010–2012
  - Google Creative Lab NYC — 2012–2014
  - Wieden+Kennedy London — ECD, 2014–2021
  - FOOD — creative studio, 2021–present
- **Own writing / primary blog:** `crackunit.com` (live site, archive scrapeable)
- **Other first-person sources:** NMA columns (historic), conference talks, awards jury appearances
- **Known aliases / spellings:** Iain Tait, Iain Tate (mis-spelling)

Wiki lives at `/Users/iaintait/Code/llm-wiki/`. When forking, replace this block with your own subject and update the absolute path in the slash commands under `~/.claude/commands/`.

---

## File Schemas & Frontmatter

Every file generated within `projects/`, `industry/`, `agencies/`, and `collaborators/` MUST begin with YAML frontmatter:

```yaml
---
title: "[Name of Project, Agency, Individual, or Area]"
type: "[project|agency|industry|collaborator]"
tags: [comma, separated, tags]
aliases: [Alternative Names, Alternate Spellings]
source_urls: [http://...]
---
```

`source_urls` MUST be populated from real research. Empty over invented.

## Required Document Structure

Every project file in `/projects/` MUST include `## Collaborators` listing each known collaborator as a markdown link to `../collaborators/<slug>.md` plus their role. Create missing profiles as stubs.

```markdown
## Collaborators

- **[Name](../collaborators/slug.md)** — Role on this project.
```

Every project file MUST end with `## References & Media` listing verified URLs and local asset links (pointing to `raw/media/<project_slug>/`).

---

## Raw Directories

The `/raw/` tree is immutable source data — LLMs read from it, never modify it (except to append new files).

| Directory | Contents |
|---|---|
| `raw/research/` | Research dumps, one per investigation: `<slug>_<YYYY-MM-DD>.md`. Required audit trail before any synthesis. |
| `raw/media/<project_slug>/` | Video thumbnails, stills, extracted frames per project. Download target for yt-dlp and curl. |
| `raw/assets/` | Generic/shared non-project assets. |
| `raw/clippings/` | Web articles captured via Obsidian Web Clipper (markdown + images). |
| `raw/archive/` | Historical archives (scraped blog posts, dead microsites recovered via Wayback, etc.). |

---

## The Ingest Pipeline

The pipeline has **five explicit stages**. Research and synthesis are separate operations. The `/research`, `/ingest`, and `/lint` slash commands each correspond to a phase of this pipeline.

### Stage 1 — Capture
Any new input (URL, PDF, screenshot, transcript, image) lands in `/raw/` first. Never edit wiki pages directly from a browser tab.

### Stage 2 — Research (write raw dump)
All web research is written to `raw/research/<slug>_<YYYY-MM-DD>.md` using the template below. This file is the audit trail — append-only, never deleted, even after ingest. This is what `/research` produces. The research skills MUST NOT touch `/projects/`, `/collaborators/`, `/agencies/`, `/industry/`, `index.md`, or `log.md` during this stage.

### Stage 3 — Synthesise (ingest into wiki)
Only after a raw dump exists does the LLM touch the synthesised layer. Every claim in `/projects/*.md` or `/collaborators/*.md` must trace to a URL that appears in the matching raw dump (or in an older raw dump already in the tree). This is what `/ingest` does.

### Stage 4 — Cross-link
Update `collaborators_index.md`, `index.md`, and any affected agency/industry files. Create missing collaborator stubs. Wrap plain-text names as markdown links wherever they appear.

### Stage 5 — Log
Append to `log.md`:

```markdown
## [YYYY-MM-DD] <action> | <target>
<2–3 line summary>
**Sources consulted:** <top 3–5 domains that produced evidence>
```

The `Sources consulted:` line is mandatory — it feeds back into the Fruitful Sources Appendix over time.

---

## Raw Research File Template

Every file in `raw/research/` follows this template:

```markdown
# <Subject> — Research Findings

**Target type:** project | collaborator | industry | agency
**Slug:** <snake_case_slug>
**Research date:** YYYY-MM-DD
**Researcher:** <research | collaborator-research>
**Trigger:** <what the user asked for>

---

## Internal evidence (grep sweep)
- <file>:<line> — <role / quote / context>

## External sources

### <Source title>
- **URL:** <url>
- **Published:** <date if findable>
- **Tier:** 1 | 2 | 3 | 4 | 5 (see Fruitful Sources Appendix below)
- **Relevance:** press | award | talk | writing | profile | patent | portfolio | credits | video
- **Key quotes / facts:** <verbatim where possible>

## Media candidates for archival
- <url> → proposed filename `YYYY_<slug>_<desc>.<ext>`

## Gaps & open questions
- <what could not be confirmed>

## Summary
- Well-evidenced: ...
- Thin: ...
- Not found: ...
```

---

## Fruitful Sources Appendix

Tiered retrieval hierarchy, ordered empirically by signal-to-noise over the last 60 days of research batches. Check tiers in order: 1 → 4 → 2 → 3 → 5. Award credit pages and peer portfolios are where hard credit evidence lives; trade press mostly restates agency releases.

### Tier 1 — Primary / always check first
- **Award databases with full credit pages:** `dandad.org`, `lovethework.com` (Cannes Lions), `webbyawards.com`, `thefwa.com`, `clios.com`, `oneshow.org`
- **`web.archive.org` (Wayback Machine)** — essential for dead project microsites and pre-2015 POKE/W+K work
- **YouTube + Vimeo** — the work itself and official case-study films
- **Subject's own writing:** `crackunit.com` (retarget this when forking)
- **Agency case-study pages:** `wklondon.com`, `wearepoke.com/archive`, `friendlondon.com`, and equivalents
- **Production-house case pages:** `themill.com`, `stinkstudios.com`, `timebasedarts.com`, `nexusstudios.com`, `framestore.com`, `private-island.tv`, `riffraff.co.uk`

### Tier 2 — Trade press (often paywalled but usually quotable)
- `lbbonline.com` — very high hit rate for credits + case studies
- `campaignlive.co.uk`
- `creativereview.co.uk`
- `itsnicethat.com`
- `thedrum.com`
- `adage.com`, `adweek.com`
- `dezeen.com`, `designweek.co.uk`

### Tier 3 — Mainstream press + cultural validation
- `theguardian.com`, `nytimes.com`, `wired.com`, `fastcompany.com`, `techcrunch.com`, `bbc.co.uk`
- Museum / cultural institution pages: `moma.org`, `cooperhewitt.org`, `vam.ac.uk`

### Tier 4 — Peer portfolios (the unlock for credits lists)
- **`cargo.site`** hosts the majority of creative portfolios in this network. `site:cargo.site "<name>"` repeatedly produces credits the trade press missed. Many portfolios require a browser User-Agent to download images — see `raw/asset_download_protocol.md`.
- `format.com`, `are.na`, personal domains.
- **Seed set:** `Grep` `/collaborators/*.md` for `cargo.site|format.com|are.na|squarespace` in `source_urls` frontmatter — those are the portfolios of other collaborators in this network, and they routinely credit each other on shared projects.
- Director reels on `vimeo.com`.

### Tier 5 — Professional profiles (last, cautious)
- LinkedIn via Apify (actors rotate — discover at runtime, do not hardcode an actor id).

### Retrieval rules
- Try Tier 1 and Tier 4 before Tier 2.
- Note each hit's tier in the raw research file.
- If a Tier-1 hit contradicts a Tier-3 mainstream press claim, Tier 1 wins and the conflict is logged.

### Preferred fetcher (anti-bot-blocking)

Use the right fetcher for the job — `WebFetch` frequently 503s on trade-press domains.

| Fetcher | Use for |
|---|---|
| **`mcp__apify__apify--rag-web-browser`** (free actor) | **Default for any Tier 1–3 content fetch.** Runs Google search + scrapes top results as markdown, bypasses most bot-blocking. Unblocked `derekandtomas.com`, Campaign, LBB Online in recent runs. |
| **Wayback Machine MCP server** | Required for Tier 1 dead-link recovery. Any time a primary URL 404s, try Wayback before declaring "not found". |
| **`mcp__apify__call-actor` + `mcp__apify__search-actors`** | Tier 5 LinkedIn, and any specialised scraper. Discover actor IDs at runtime. |
| **`WebSearch`** | Query discovery (finding URLs to fetch). Poor for content extraction — pair with rag-web-browser. |
| **`WebFetch`** | Last resort. Only use for URLs known to render cleanly without JS or bot challenges (Wikipedia, openlibrary.org, raw GitHub markdown). |
| **`yt-dlp`** (Bash) | Video/audio archival into `raw/media/`. |
| **`curl -A "Mozilla/5.0"`** | Still images from portfolio CDNs (cargo.site, format.com). Without the UA, CDNs return a ~919-byte bot-block placeholder. |

**Fetcher decision tree:** Try rag-web-browser first → if the URL is dead, try Wayback → if the UA is being challenged, try `curl -A "Mozilla/5.0"` → if all else fails, `WebFetch` as last resort.

---

## Linting Protocol

`/lint [scope]` runs the five-pass lint described in `~/.claude/commands/lint.md`:

1. Schema compliance (`npx markdownlint-cli "**/*.md"` + frontmatter + mandatory sections)
2. Cross-link integrity (dead links, orphan collaborators, plain-text names needing upgrade)
3. Asset integrity (local files exist, projects have at least one asset)
4. Raw→wiki provenance (every recently-edited synthesised file has a matching `raw/research/*.md`)
5. Content drift (scope `all` only — contradictions across pages)

`raw/` is excluded from markdownlint via `.markdownlintignore`. Multi-H1 and duplicate-heading warnings are ignored.

---

## Compilation

`python compress.py` produces a portable concatenated copy of the wiki.

---

## Logging & Tracking (`log.md`)

`log.md` is the chronological append-only record. Every ingest or significant update adds a section starting with `## [YYYY-MM-DD] <action> | <target>` followed by a short summary and a mandatory `**Sources consulted:**` line.
