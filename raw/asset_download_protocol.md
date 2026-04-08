# Asset Download Protocol

**Purpose:** Download real, verifiable campaign assets (video thumbnails and hero frames) to illustrate each project file. This is not about website screenshots — it's about capturing the actual creative work.

**Last updated:** 2026-04-07

---

## Principles

1. **Actual work only** — thumbnails and frames extracted from the official campaign films. Never screenshots of websites, article pages, browser windows, or social media feeds.
2. **Verified sources** — YouTube/Vimeo URLs from project files, or confirmed official uploads (not fan reuploads).
3. **Minimal footprint** — default to thumbnail images only. Full video downloads only for landmark campaigns where video is essential to document the work (e.g., interactive film).
4. **Traceable** — every downloaded file has a matching `.info.json` so the source URL is permanently recorded.

---

## Asset Tiers

**Default: one good image per campaign is enough.** Only go further if the work is genuinely cinematic and varied enough to warrant it.

| Tier | When | What to download |
|------|------|------------------|
| **1 — Thumbnail** | All video campaigns (default) | Max-resolution YouTube/Vimeo thumbnail via yt-dlp. One image, ~100–500KB. |
| **2 — Frame selection** | Long-form films (>60s) with varied visual language | Download video, extract 3–6 frames with `extract_frames.sh`. Only if thumbnail alone doesn't capture the work. |
| **3 — Press photography** | Print, OOH, interactive, or when no video exists | Individual JPEGs from W+K case study, LBBonline, Campaign press kits. |

Frame count guide for Tier 2:
- 30s spot → skip frames, thumbnail only (all frames look the same)
- 60–90s spot → 3–4 frames max
- 90s+ / long-form → 5–6 frames

---

## Naming Convention

Follow the pattern established in `raw/media/`:

```
{year}_{project_slug}.{ext}           ← single hero asset
{year}_{project_slug}_hero.{ext}      ← primary film thumbnail
{year}_{project_slug}_film2.{ext}     ← second execution thumbnail
{year}_{project_slug}_bts.{ext}       ← behind-the-scenes
{year}_{project_slug}.info.json       ← yt-dlp metadata (always kept alongside)
```

Year = year of the campaign (not download year).

---

## Step-by-Step Workflow

### Step 1 — Find the video URL

Check the project's `## References & Media` section for YouTube/Vimeo links.

If no link exists, use yt-dlp search to find the official upload:
```bash
/opt/homebrew/bin/yt-dlp --get-id "ytsearch1:{Campaign Name} official {year}"
```
Verify the result is the real official upload (check channel name, view count, upload date).

Once confirmed, add the URL to the project file's references section.

### Step 2 — Download thumbnail (Tier 1)

**Note:** ffmpeg is now installed. yt-dlp will use it automatically for conversion and merging.

Assets live in per-project subfolders: `raw/media/{project_slug}/`

```bash
mkdir -p /Users/iaintait/Code/llm-wiki/raw/media/{project_slug}
cd /Users/iaintait/Code/llm-wiki/raw/media/{project_slug}

/opt/homebrew/bin/yt-dlp \
  --write-thumbnail \
  --write-info-json \
  --skip-download \
  -o "{year}_{project_slug}.%(ext)s" \
  "{youtube_or_vimeo_url}"

# Convert webp → jpg
sips -s format jpeg {year}_{project_slug}.webp --out {year}_{project_slug}.jpg && rm {year}_{project_slug}.webp
```

This produces:
- `raw/media/{project_slug}/{year}_{project_slug}.jpg` — thumbnail
- `raw/media/{project_slug}/{year}_{project_slug}.info.json` — metadata (source URL permanently recorded)

### Step 3 — Download video (Tier 2, opt-in only)

```bash
/opt/homebrew/bin/yt-dlp \
  -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]" \
  --write-thumbnail \
  --write-info-json \
  --convert-thumbnails jpg \
  -o "/Users/iaintait/Code/llm-wiki/raw/media/{year}_{project_slug}.%(ext)s" \
  "{youtube_or_vimeo_url}"
```

### Step 4 — Back-link into the project file

In the project's `## References & Media` section, add an Assets subsection:

```markdown
### Assets
![Campaign hero thumbnail](../raw/media/{project_slug}/{year}_{project_slug}.jpg)
```

For multiple frames:
```markdown
### Assets
![Hero frame](../raw/media/{project_slug}/{year}_{project_slug}_frame_01.jpg)
![Second frame](../raw/media/{project_slug}/{year}_{project_slug}_frame_02.jpg)
```

---

## Campaigns Without Official Video

For interactive or print campaigns where no official YouTube/Vimeo upload exists:

1. Check W+K London case study page for embedded video or hosted images
2. Look for press photography on LBBonline "Behind the Work" feature
3. Download with curl (see the Portfolio CDN section below for User-Agent requirements):
   ```bash
   curl -A "Mozilla/5.0" -o "/Users/iaintait/Code/llm-wiki/raw/media/{project_slug}/{year}_{project_slug}.jpg" "{image_url}"
   ```
4. Note the source URL in the info alongside the file (create a `{slug}.source.txt` with the URL)

---

## Portfolio CDN Stills (cargo.site, format.com, squarespace)

**The lesson from the Headmaster (2026-04-08) ingest:** many creative portfolio sites sit behind CDNs that return a ~919-byte placeholder when the request lacks a browser User-Agent. Without the UA, you'll get a tiny HTML file instead of the real image and not notice until you try to view it.

**Always pass a browser UA:**

```bash
curl -A "Mozilla/5.0" \
  -o "/Users/iaintait/Code/llm-wiki/raw/media/{project_slug}/{year}_{project_slug}_{desc}.{ext}" \
  "{image_url}"
```

**Validate the download.** If the resulting file is under 10KB, assume it's the bot-block placeholder. Retry with:

1. A different UA string (e.g. `curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"`).
2. If that still fails, use `mcp__apify__apify--rag-web-browser` to fetch the page as rendered markdown, extract the real (often signed/CDN-rewritten) image URL from the markdown, and retry the curl with that URL.

**Known portfolio hosts that need the UA header:**
- `cargo.site` — confirmed Headmaster 2026-04-08
- `format.com`
- `squarespace.com` image CDNs
- Most personal domain portfolios fronted by Cloudflare

**Batch download loops.** Do not use shell `for` loops with colon-separated `URL:filename` pairs — they fail unpredictably. Expand to one `curl` invocation per file, each on its own line. Easier to retry individual failures.

---

## What NOT to Download

- Screenshots of websites (even campaign microsites that no longer exist)
- Screenshots of articles or social media pages
- Fan reuploads, parody versions, or low-quality mirrors
- Duplicate thumbnails of the same film under different filenames

---

## Campaign Asset Register

Track completion here as assets are downloaded.

| Project File | Year | Assets | Status |
|---|---|---|---|
| `wk_f1_neeeum.md` | 2019 | `2019_f1_neeeum_mix.jpg` + 3 frames from WGTT music video | ✓ |
| `wk_sainsburys_nicholas_the_sweep.md` | 2019 | 6 frames across full 2:31 film | ✓ |
| `wk_tk_maxx_ridiculous_possibilities.md` | 2016 | 3 frames (30s spot; frames 1, 2, 4 — skipped near-duplicate) | ✓ |
| `wk_honda_the_other_side.md` | 2015 | 4 frames from crime-story side of film | ✓ |

*(Update this table as assets are added. All other projects pending.)*
