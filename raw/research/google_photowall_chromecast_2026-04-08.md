# Photowall for Chromecast — Research Findings

**Target type:** project
**Slug:** google_photowall_chromecast
**Research date:** 2026-04-08
**Researcher:** collaborator-research (triggered as part of Igor Clark / Suz Chambers research)
**Trigger:** User confirmed this project should be created. Two primary URLs provided: https://chrome.googleblog.com/2014/03/chrome-experiments-now-featuring.html and https://experiments.withgoogle.com/photowall-for-chromecast

---

## Internal evidence (grep sweep)

No existing project file — `google_photowall_chromecast.md` does not yet exist.

**User testimony (2026-04-08):** "yes" — confirmed this project should be created. Provided both primary URLs directly.

---

## External sources

### Chrome Blog — "Chrome Experiments Now Featuring Chromecast"
- **URL:** https://chrome.googleblog.com/2014/03/chrome-experiments-now-featuring.html
- **Published:** March 24, 2014
- **Tier:** 1 (Google's own official blog — primary source)
- **Relevance:** project announcement, credits
- **Key facts:** Official launch announcement. Announced Photowall for Chromecast as a Chrome Experiment with Chromecast integration.

### Experiments with Google — Photowall for Chromecast
- **URL:** https://experiments.withgoogle.com/photowall-for-chromecast
- **Published:** March 2014
- **Tier:** 1 (Google's own experiments archive — primary source)
- **Relevance:** project listing, description
- **Key facts:** Official Chrome Experiments entry. Accessible via `chrome.com/photowall`. Real-time collaborative photo sharing to TV via Chromecast.

### Google Developers Blog — "Taking Chrome Experiments to the TV"
- **URL:** https://developers.googleblog.com/taking-chrome-experiments-to-the-tv/
- **Published:** March 27, 2014
- **Tier:** 1 (Google's own developer blog — primary source)
- **Relevance:** technical deep-dive, team credit
- **Key quotes:** "By Igor Clark, Google Creative Lab" — direct byline. "Igor Clark is Creative Tech Lead at Google Creative Lab."
- **Key facts:** Full technical breakdown of Node.js server, Google Cast SDK implementation, WebSockets mesh, App Engine backend.

### LAD Studio (Lucas Allen Designs) — Photowall case study
- **URL:** https://www.lad.studio/photowall
- **Published:** n/d
- **Tier:** 4 (production partner portfolio — peer portfolio)
- **Relevance:** full team credits, project description
- **Key quotes (verbatim credits):**
  - ECD: Iain Tait
  - 3D & Art Direction: Lucas Hearl
  - Creative Tech: Igor Clark, George Michael Brower, Justin Windle, Hook
  - Production: Susan Chambers, Asa Block
  - Film & Editing: Ghost Robot

---

## Project description (from primary sources)

**What it was:** A Chrome Experiment enabling real-time collaborative photo sharing to a TV screen via Chromecast. Users set up a Photowall on their TV using Chrome, then guests contributed photos from mobile web via a unique five-digit code. Photos could be edited (cropped, doodled on, captioned) before appearing on the shared wall. On completion, the experience automatically generated a YouTube video of the full Photowall session.

**Platform:** Chrome Experiment + Chromecast. Short URL: `chrome.com/photowall`

**Launch date:** March 2014 (Chrome Blog announcement March 24, 2014; technical post March 27, 2014)

**Technical stack:**
- Google Cast SDK (sender + receiver APIs)
- Node.js server on Google Compute Engine
- Google App Engine (wall creation, authentication, photo storage)
- App Engine Datastore (backend coordination)
- WebSockets (real-time mesh between host, guests, Chromecast)

**Agency:** Google Creative Lab, New York

---

## Full collaborator credits (from LAD Studio portfolio)

| Name | Role | Profile status |
|---|---|---|
| Iain Tait | Executive Creative Director, GCL | Existing |
| Igor Clark | Creative Tech, GCL | Creating (this batch) |
| George Michael Brower | Creative Tech, GCL | Not yet in wiki |
| Justin Windle | Creative Tech, GCL | Not yet in wiki |
| Hook (Studios) | Creative Tech (external dev partner) | Not yet in wiki |
| Lucas Hearl | 3D & Art Direction | Not yet in wiki |
| Susan Chambers (Suz) | Production, GCL | Creating (this batch) |
| Asa Block | Production, GCL | Not yet in wiki |
| Ghost Robot | Film & Editing | Not yet in wiki |

---

## Awards

No D&AD, FWA, Cannes Lions, or Webby awards found for Photowall specifically.

---

## Press

No trade press coverage found in Campaign Live, It's Nice That, or The Drum.

---

## Media candidates for archival

- https://experiments.withgoogle.com/photowall-for-chromecast — check for embed/video
- YouTube: search for "Photowall Chromecast Google Chrome Experiment" — likely a demo video exists

---

## Gaps & open questions

- No awards found; possible the project was not entered into award shows.
- Ghost Robot (film/editing) and Hook (dev) are production companies — may be worth creating minimal collaborator stubs.
- George Michael Brower, Justin Windle, Asa Block are named GCL team members — user may want to add profiles for these if they remember working with them.

---

## Summary

- **Well-evidenced:** Project existence, launch date, description (Tier 1 Google sources). Team credits from LAD Studio portfolio (Tier 4 peer). Igor Clark's specific role (Tier 1 Google Developers blog byline).
- **Thin:** No awards, limited press coverage.
- **Not found:** Dedicated case study video.
