---
title: "Photowall for Chromecast"
type: project
tags:
  - Google-Creative-Lab
  - Chrome-Experiment
  - Chromecast
  - real-time
  - collaborative
  - WebSockets
  - 2014
aliases:
  - Photowall
  - Chrome Photowall
  - chrome.com/photowall
source_urls:
  - 'https://experiments.withgoogle.com/photowall-for-chromecast'
  - 'https://chrome.googleblog.com/2014/03/chrome-experiments-now-featuring.html'
  - 'https://developers.googleblog.com/taking-chrome-experiments-to-the-tv/'
  - 'https://www.lad.studio/photowall'
agency: 'Google Creative Lab, New York'
client: Google Chrome / Chromecast
year: 2014
primary_role: Executive Creative Director
---

# Photowall for Chromecast

A Chrome Experiment that turned any Chromecast-connected TV into a real-time collaborative photo wall. Launched March 2014 as one of the first interactive experiences built on the Google Cast SDK — extending Chrome Experiments beyond the browser and onto the living room screen.

## The Concept

Users set up a Photowall on their TV via Chrome on desktop. Guests joined from any mobile browser using a unique five-digit code — no app install required. Each guest could contribute photos, edit them in the browser (cropping, doodling, captioning), and watch them appear in real time on the shared TV display. On session close, the experience automatically generated a YouTube video of the complete Photowall.

**Short URL:** `chrome.com/photowall`

## Technical Execution

- **Google Cast SDK** — sender and receiver APIs for host–guest–Chromecast communication
- **Node.js** server on Google Compute Engine
- **Google App Engine** — wall creation, authentication, and photo storage
- **App Engine Datastore** — backend coordination
- **WebSockets** — real-time mesh network between host, all guests, and the Chromecast receiver

The technical deep-dive was published directly by Igor Clark on the Google Developers Blog (March 27, 2014): *"Taking Chrome Experiments to the TV."*

## Collaborators

**Google Creative Lab:**
- **[Iain Tait](../collaborators/iain_tait.md)** — Executive Creative Director
- **[Igor Clark](../collaborators/igor_clark.md)** — Creative Tech Lead *(evidence: Google Developers blog byline "By Igor Clark, Google Creative Lab")*
- **[George Michael Brower](../collaborators/george_michael_brower.md)** — Creative Tech *(evidence: LAD Studio portfolio)*
- **[Justin Windle](../collaborators/justin_windle.md)** — Creative Tech *(evidence: LAD Studio portfolio)*
- **[Suz Chambers](../collaborators/suz_chambers.md)** — Production *(evidence: LAD Studio portfolio "Susan Chambers")*
- **[Asa Block](../collaborators/asa_block.md)** — Producer *(evidence: LAD Studio portfolio + Behance GCL core team)*
- **Lucas Hearl** — 3D & Art Direction *(evidence: LAD Studio portfolio)*

**External partners:**
- **Hook** — Creative Tech / development partner *(evidence: LAD Studio portfolio)*
- **Ghost Robot** — Film & Editing *(evidence: LAD Studio portfolio)*

## References & Media

### Primary
- [Experiments with Google: Photowall for Chromecast](https://experiments.withgoogle.com/photowall-for-chromecast)
- [Chrome Blog: "Chrome Experiments Now Featuring Chromecast" (March 24, 2014)](https://chrome.googleblog.com/2014/03/chrome-experiments-now-featuring.html)
- [Google Developers Blog: "Taking Chrome Experiments to the TV" — by Igor Clark (March 27, 2014)](https://developers.googleblog.com/taking-chrome-experiments-to-the-tv/)

### Credits
- [LAD Studio: Photowall case study (full team credits)](https://www.lad.studio/photowall)

### Raw Research
- [Raw research file](../raw/research/google_photowall_chromecast_2026-04-08.md)
