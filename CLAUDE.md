# System Rules for Iain Tait's Forensic Career Archive

You are maintaining the professional, 25-year career archive of Iain Tait. Your goal is to synthesize raw sources into a sophisticated, highly-interlinked markdown knowledge graph that provides *verifiable* evidence of all claims and assets.

## File Schemas & Frontmatter

**Rule:** Every file generated within `projects/`, `industry/`, `agencies/`, and `collaborators/` MUST include the following YAML frontmatter at the top of the document:

```yaml
---
title: "[Name of Project, Agency, Individual, or Area]"
type: "[project|agency|industry|collaborator]"
tags: [comma, separated, tags]
aliases: [Alternative Names, Alternate Spellings]
source_urls: [http://...]
---
```

*Note: The `source_urls` array MUST be populated via active web research or provided raw materials. Do not leave it blank if at all possible.*

## Required Document Structure

**Rule:** Every single project file inside `/projects/` MUST include a mandatory section called `## Collaborators`.
This section must list every known collaborator with:

- A markdown link to their profile in `collaborators/` (create one if it doesn't exist)
- Their role on the project (e.g., Director, Developer, Designer, Producer, ECD)

Format:

```markdown
## Collaborators

- **[Name](../collaborators/slug.md)** — Role on this project.
```

If a collaborator doesn't yet have a profile, create one in `collaborators/` and add them to `collaborators_index.md`.

**Rule:** Every single project file inside `/projects/` MUST end with a mandatory section called `## References & Media`.
This section must itemize:

1. **Verified URLs:** Links to live articles, Wikipedia entries, Internet Archive links, or official video links (YouTube/Vimeo).
2. **Assets:** Markdown image or file links pointing to local files downloaded to `raw/assets/` via the Obsidian Web Clipper protocol. *(e.g., `![Campaign Banner](../raw/assets/banner.jpg)`)*

## Logging & Tracking (`log.md`)

**Rule:** `log.md` is our chronological append-only record of wiki updates. Every ingest or significant update pass must add a new section starting with `## [YYYY-MM-DD] <Action> | <Target>`.

## The Execution Workflow

### 1. The Ingest Pipeline

When instructed to ingest a new raw source:

1. **Read** the unstructured file from `raw/`.
2. **Synthesize** the content into the most appropriate directory (`projects/`, `industry/`, etc.), enforcing the YAML schema and the `## References & Media` requirement. Hunt down URLs if missing.
3. **Cross-Link** proactively to agencies and collaborators.
4. **Index** the new page within the master `index.md` document at the root.
5. **Log** the operation in `log.md`.

### 2. The Linting Protocol

After significant editing sessions, verify technical compliance.
**Command:** `npx markdownlint-cli "**/*.md"`
*Note: The `raw/` directory and compilation files are excluded via `.markdownlintignore`. Multi-H1 and duplicate heading warnings are ignored.*

### 3. Compilation (`compress.py`)

To generate a portable version of the wiki, execute:
**Command:** `python compress.py`
