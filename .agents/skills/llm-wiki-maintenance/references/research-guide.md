# Open Knowledge Ingestion & Research Playbook

Conventions and rules for populating the LLM wiki archive with new projects, collaborators, and research data in compliance with the Open Knowledge Framework.

## 1. Directory Structure
The wiki database is built directly from raw markdown documents. The directories map to database entities:

| Directory | Entity / Content |
|---|---|
| `/projects/` | Individual creative campaigns and digital projects. |
| `/collaborators/` | Peer profiles, clients, and partners. |
| `/agencies/` | Ad agencies, studios, and consultancies. |
| `/industry/` | Speeches, talks, FAQs, and system guides. |
| `/raw/` | Immutable primary research sources (e.g. video case studies, clips, screenshots, PDFs). |

## 2. Document Frontmatter & Schema
Every file generated inside these folders MUST start with YAML frontmatter containing metadata:

```yaml
---
title: "[Name of Project, Agency, Individual, or Area]"
type: "[project|agency|industry|collaborator]"
tags: [comma, separated, tags]
aliases: [Alternative Names, Alternate Spellings]
source_urls: [http://...]
---
```
*   `source_urls` MUST be populated from real, verified research. Empty over invented.

## 3. Required Document Structure
*   **Collaborators**: Every campaign or project in `/projects/` must list known collaborators as markdown links to `../collaborators/<slug>.md` plus their role:
    ```markdown
    ## Collaborators

    - **[Name](../collaborators/slug.md)** — Role on this project.
    ```
*   **References & Media**: Every project file must end with references pointing to verified URLs and local raw media:
    ```markdown
    ## References & Media

    - [Cannes Cyber Lions Cyber Grand Prix Case Study](https://...)
    - ![Old Spice loop video](file:///Users/iaintait/Code/llm-wiki/raw/media/wk_old_spice_responses/case_study.mp4)
    ```

## 4. The Ingestion Pipeline
To ingest new research or career milestones:
1.  **Capture**: Place raw assets (screenshots, mp4 loops, case study files) into the appropriate folder under `raw/media/<project_slug>/`.
2.  **Synthesise**: Create or edit the markdown profile using correct schemas and metadata. Every claim must trace back to a file in `/raw/` or a validated URL.
3.  **Cross-link**: Link connected profiles (e.g. add the collaborator to the project and link from the collaborator page back to the project page).
4.  **Database Sync**: Run `npm run db:sync` to compile documents, populate `local.db`, and regenerate normalized text embeddings.

## 5. Fruitful Sources Appendix (Tiers 1–5)
When enriching or validating credits lists, check resources in the following order of reliability:

### Tier 1 — Primary / Verified Sources
*   **Award databases with full credits**: `dandad.org`, `lovethework.com` (Cannes Lions), `webbyawards.com`, `thefwa.com`, `clios.com`, `oneshow.org`
*   **Wayback Machine (`web.archive.org`)**: Vital for dead agency/project microsites.
*   **YouTube + Vimeo**: Visual evidence and case study films.
*   **Subject's writing**: Scraping `crackunit.com` (Iain's primary blog).

### Tier 2 — Trade Press
*   `lbbonline.com` (high hit rate for credits list), `campaignlive.co.uk`, `creativereview.co.uk`, `itsnicethat.com`, `thedrum.com`, `adage.com`.

### Tier 3 — Mainstream Press & Cultural Venues
*   `theguardian.com`, `nytimes.com`, `wired.com`.
*   Museum / cultural archives: `moma.org`, `cooperhewitt.org`, `vam.ac.uk`.

### Tier 4 — Peer Portfolios (Highly recommended for credits)
*   Search `site:cargo.site "<name>"` or format.com, are.na to discover the personal portfolios of other collaborators. They frequently credit partners on shared projects.

### Tier 5 — Professional Profiles
*   LinkedIn via Apify scrapers (cautious, verify against other tiers).

## 6. Preferred Fetchers Decision Tree
To bypass bot challenges and extract data cleanly:
1.  **Default**: Use `apify--rag-web-browser` for general searches and scraping.
2.  **Dead links**: Use the Wayback Machine MCP client.
3.  **Image assets/Portfolio CDNs**: Use `curl -A "Mozilla/5.0"` (custom User-Agent prevents bot blocking).
4.  **Wikipedia/GitHub raw files**: Use `WebFetch`.
