# LLM Wiki: Forensic Career Archive (`idea.md`)

This document supersedes generic LLM wiki architectures. It serves as the master blueprint for the *Forensic Career Archive* of Iain Tait.

This wiki is an LLM-maintained, persistent knowledge base that captures, synthesizes, and interlinks 25 years of creative output, industry leadership, and collaboration. Crucially, it is not just text; it is an evidence-backed repository supported by verified URLs, local assets (images/videos), and precise Obsidian workflows.

## The Human-in-the-Loop Setup (Obsidian)

The LLM does the heavy lifting of synthesis, but **Obsidian** is the Integrated Development Environment (IDE) where the human operates.

### The "Step Before" (Raw Ingestion Protocol)

Before the LLM can synthesize a project, we must aggressively gather the raw, unstructured evidence.

1. **The Obsidian Web Clipper:** Use the official Obsidian Web Clipper browser extension to ingest PR articles, agency pages, or Wikipedia entries.
2. **Auto-Downloading Assets:**
   - **Configuration:** In Obsidian Settings → Files and links, set "Attachment folder path" to `raw/assets/`.
   - **Hotkeys:** Go to Settings → Hotkeys, search for "Download attachments for current file", and bind it to a hotkey (e.g., CMD+Shift+D).
   - **Workflow:** When clipping an article, immediately hit the hotkey so that all web images are pulled directly to your local drive. This forces the archive to become permanent rather than relying on brittle web hyperlinks.
3. **PDF Drops:** Simply drag and drop original pitch decks, PDFs, or scan documents directly into `raw/`.

## Architecture domains

The archive is divided into strictly defined domains:

### 1. `raw/`

The immutable source of truth. Scrapes, PDFs, raw text from the ingestion protocol above. The LLM reads from this directory but **never modifies it**. It contains the local `assets/` subfolder.

### 2. `projects/`

Synthesized case studies of specific work (e.g., campaigns, product launches).
*Strict Requirement:* Every project must end with a `## References & Media` section pointing to verified URLs and local assets.

### 3. `industry/`

Documentation of industry footprint and thought leadership (e.g., Keynotes, Writings, Juries).

### 4. `agencies/`

The institutional nodes. Major companies where projects converge (Wieden+Kennedy, POKE, Google).

### 5. `collaborators/`

Persistent profiles of creative partners to track relationships laterally across multiple eras.

## Operations & Output

- **Master Indexing (`index.md`):** The structured, hierarchical table of contents at the root.
- **Output Compilation (`compress.py`):** Runs periodically to walk the complete directory and output a single flattened file (`iaintait.md`) for portability.
- **Linting:** We utilize `markdownlint-cli` with custom exclusions (allowing `MD024` duplicate headings and `MD025` multiple H1s) to maintain structural integrity.
