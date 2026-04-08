# Wiki Activity Log

## [2026-04-07] audit-fixes | Full schema compliance pass

- Fixed malformed YouTube URL in `wk_helping_everyone_eat_better.md` (replaced invalid slug with `_Z13_bNKgPA`)
- Added `year: 2007` to `poke_spot_the_bull.md` frontmatter
- Standardised 9 FOOD/confidential project files to Schema A (added `type: project`, `tags`, `aliases`, `source_urls`, removed non-standard `role:` field)
- Fixed `confidential/google_ad_tech_research.md` — added full Schema A frontmatter, restructured inline collaborators to `## Collaborators` section
- Added `## Collaborators` and `## References & Media` sections to all 10 FOOD/confidential project files previously missing them
- Added top-level `## Collaborators` section to `wk_brand_establishments.md`
- Back-filled `### Assets` sections to 6 POKE project files with Wayback images: `poke_balloonacy`, `poke_kate_moss_topshop`, `poke_malice_box`, `poke_netted_brand_new_group`, `poke_orange_unlimited`, `poke_spot_the_bull`
- Added `### Assets` sections with GIFs + frames to 2 FOOD projects: `food_kef_listen_and_believe`, `food_chemical_brothers_music_response`
- Added `### Assets` sections with GIFs + frames to 5 industry talks: `psfk_10_reasons_digital`, `playful_london_high_scores`, `radiohead_marketing`, `under_the_influence`, `here_london_2015`, `wk_iain_tait_video`
- Added 4 new collaborators to `collaborators_index.md`: Niantic, Private Island, Tool of North America, Framestore
- Fixed blank-line markdown lint errors in 4 new collaborator files (MD022/MD032)

## [2026-04-07] cleanup | FOOD stub projects removed, assets consolidated

- Deleted 22 stub project files from `projects/` (created prematurely without proper research)
- All per-project media dirs consolidated into `raw/media/food_assets/` (flat, ~170 files)
- Original Drive downloads moved to `raw/media/food_assets/originals/`
- Assets for the 3 existing FOOD project files remain in their original locations
- Stubs removed: food_rosalia, food_emcee_rebrand, food_cybotron_glastonbury, food_hinge_ai_dating_coach, food_air_rebrand, food_interview, food_earth, google_ai_consultancy, food_rolling_stone, food_ikea_live, food_offal, food_mana, food_nuts, food_interview_2, food_mulberry_softie_ooh, food_selfridges_windows, food_mac, food_selfridges, food_mulberry_wild_within, food_nuts_publication, food_heavy_traffic, food_mulberry_softie

## [2026-04-07] ingest | FOOD studio projects — full video asset pass

### Source
- Google Drive folder shared by Iain: `drive.google.com/drive/folders/1MdhWbgxSGgirHf9dnaIstM_cZkm0O4ac`
- Downloaded via `gdown --folder` (installed to `/Users/iaintait/Library/Python/3.9/bin/gdown`)
- 25 video files + CSV mapping (`Food Website Dashboard - videos (1).csv`)

### Projects created (22 new) + updated (3 existing)
New project files created in `projects/`:
`food_rosalia`, `food_emcee_rebrand`, `food_cybotron_glastonbury`, `food_hinge_ai_dating_coach`, `food_air_rebrand`, `food_interview`, `food_earth`, `google_ai_consultancy`, `food_rolling_stone`, `food_ikea_live`, `food_offal`, `food_mana`, `food_nuts`, `food_interview_2`, `food_mulberry_softie_ooh`, `food_selfridges_windows`, `food_mac`, `food_selfridges`, `food_mulberry_wild_within`, `food_nuts_publication`, `food_heavy_traffic`, `food_mulberry_softie`

Updated: `food_chemical_brothers_music_response`, `food_kef_listen_and_believe`, `food_superblue_jr_reality`

### Assets
- Videos organised into per-project subfolders in `raw/media/`
- 6 frames extracted from each (4 frames for clips <8s)
- Animated GIF created per project (150cs/frame, 640px max, 256 colours, gifsicle optimised)
- Note: 5 videos were very short loops (2–8s); frame extraction used zero start-skip for these

## [2026-04-07] assets | Full video URL search + GIF generation for all projects

### URL Research
- Searched for video URLs across all ~50 projects with no assets
- **New confirmed URLs found and downloaded:**
  - `wk_sainsburys_food_dancing` — Vimeo 263321147 (MysDiggi's own upload)
  - `wk_sainsburys_the_big_night` — YouTube tvXBbsRU83Q (Sainsbury's official)
  - `wk_coca_cola_the_letter` — YouTube yg4Mq5EAEzw (Coca-Cola official)
  - `wk_facebook_still_going_strong` — YouTube AARdkJfTYFY (Facebook official, 1:00)
  - `wk_honda_dream_makers` — YouTube XpOgXZ6gESc (W+K confirmed)
  - `wk_three_real_5g` — Vimeo 394195776 (W+K London, credits confirmed)
  - `wk_three_go_roam` — YouTube sShpDQ1S7Yc (Three UK official)
  - `wk_niantic_ingress_prime` — Vimeo 315856482 (user-provided)
  - `wk_national_trust_everyone_needs_nature` — YouTube XUAmvfXiOLM (National Trust)
  - `wk_harry_potter_wizards_unite` — YouTube SJO1C6yHCu4 (Niantic official launch trailer)
  - `wk_helping_everyone_eat_better` — YouTube _Z13_bNKgPA (Sainsbury's official)
  - `wk_rovio_angry_birds_2` — Vimeo 628947321 (Mark Shanley's archive, user-provided)
  - `google_chromebook_for_everyone` — YouTube Ba2Tfm0dyNY (user-provided)
  - `wk_f1_global_rebrand` — YouTube 0za98VMTPck (F1 official logo reveal)
- **Dead URLs replaced** in: wk_rovio_angry_birds_2 (175Bq3MSrWo→628947321), google_chromebook_for_everyone (S95J5BowMmk→Ba2Tfm0dyNY), wk_f1_global_rebrand (Vimeo 261057373→YouTube 0za98VMTPck)
- **No video found / no video exists:** W+K Brand Establishments, Coca-Cola Polar Bowl (activation), POKE interactive era (Balloonacy, Global Rich List, Orange Talking Point, Kate Moss Topshop, Warholiser, Room 10101, Spot the Bull — websites/installations with no films)

### Frame Extraction
- **38 new projects** with 6 frames each extracted via `extract_frames.sh` (skip first 8s, skip last 4s, evenly spaced)
- Total frame count across wiki: ~228 frames across ~38 project subfolders

### Animated GIFs
- **38 animated GIFs** created via ImageMagick + gifsicle: 6 frames × 1.5s delay, max 640px wide, 256-colour palette, gifsicle --optimize=3
- Installed: ImageMagick (`/opt/homebrew/bin/magick`) + gifsicle (`/opt/homebrew/bin/gifsicle`)
- Size range: 106KB (google_coder) — 886KB (tk_maxx_ridiculous_possibilities)
- Every project with frames now has an animated GIF linked as first asset in `### Assets`

## [2026-04-07] assets | Asset download protocol + first 4 campaigns

- **Protocol document:** `raw/asset_download_protocol.md` — method for thumbnail downloads, frame extraction, and press image retrieval
- **Script:** `raw/extract_frames.sh` — ffmpeg-based frame extractor, evenly spaced, skips first 8s and last 4s
- **Tools:** yt-dlp (`/opt/homebrew/bin/yt-dlp`) + ffmpeg (installed this session) + sips for webp→jpg
- **Assets added:**
  - `wk_f1_neeeum.md` — NEEEUM mix thumbnail + 3 frames from "We've Got To Try" music video
  - `wk_sainsburys_nicholas_the_sweep.md` — 6 frames across full 2:31 film (Dickensian street → final reindeer shot)
  - `wk_tk_maxx_ridiculous_possibilities.md` — 3 frames from Trampoline spot (incl. "Ridiculous" typography frame)
  - `wk_honda_the_other_side.md` — 4 frames from nighttime crime-story side of film + YouTube URL added
- **Lesson:** Verify YouTube video before downloading (first Honda result was an adforum case study reel). Thumbnail check is in the protocol.
- **Default:** One thumbnail per campaign is enough. Frames only for long-form (>60s) with genuinely varied visual language.

## [2026-04-07] ingest | Four new W+K London projects + five new collaborator profiles

### New Project Files
- **Sainsbury's: Food Dancing (Jan 2017)** — `projects/wk_sainsburys_food_dancing.md`. W+K's debut Sainsbury's campaign. ECDs Iain Tait & Tony Davidson; CDs Scott Dungate & Sophie Bodoh; Creatives Freddy Taylor, Philippa Beaumont, Andrew Bevan; Director Siri Bunford (Knucklehead); song "Food Dancing (Yum Yum Yum)" by MysDiggi; #1 Spotify Viral Chart; FAB Awards Gold + 3 Silvers.
- **Sainsbury's: The Big Night (Christmas 2018)** — `projects/wk_sainsburys_the_big_night.md`. Michael Gracey (The Greatest Showman) director; viral "Plugboy" / #PlugLife; "You Get What You Give" New Radicals; British Arrows 2× Silver; Partizan; DOP Pau Castejon. Creatives Freddy Taylor, Philippa Beaumont, Andrew Bevan.
- **Facebook: Still Going Strong (May 2020)** — `projects/wk_facebook_still_going_strong.md`. W+K London's first Facebook TV work, in collaboration with W+K Portland. About Facebook Groups during COVID. Debuted on ESPN during The Last Dance. CD David Dao; Creatives Katy Edelsten & Rachel Clancy; Director Maceo Frost (Knucklehead); VFX Time Based Arts.
- **Coca-Cola: The Letter (Nov 2020)** — `projects/wk_coca_cola_the_letter.md`. 100 years of Coca-Cola Christmas advertising; 90+ markets globally. Director Taika Waititi (Hungry Man); filmed in New Zealand during COVID via Zoom. ECDs Iain Tait, Tony Davidson, Joe De Souza; CD Juan Sevilla; Creatives Ben Shaffery & Tomas Coleman; DOP John Toon; VFX The Mill; Composer Alex Baranowski; Sound Sam Ashwell (750mph).

### New Collaborator Profiles
- **Freddy Taylor** — `collaborators/freddy_taylor.md`. Creative / Art Director, W+K London. Duo with Philippa Beaumont (freddyandphilippa.com). Food Dancing, The Big Night.
- **Philippa Beaumont** — `collaborators/philippa_beaumont.md`. Creative / Copywriter, W+K London. Duo with Freddy Taylor. Angry Birds 2, Food Dancing, The Big Night.
- **David Dao** — `collaborators/david_dao.md`. Creative Director, W+K London. Facebook Still Going Strong.
- **Scott Dungate** — `collaborators/scott_dungate.md`. Creative Director, W+K London. Honda The Other Side, Sainsbury's Food Dancing and The Big Night.
- **Sophie Bodoh** — `collaborators/sophie_bodoh.md`. Creative Director, W+K London. Sainsbury's Food Dancing and The Big Night.

### Updates
- `collaborators/juan_sevilla.md` — added Coca-Cola The Letter credit (CD, 2020)
- `index.md` — added 4 new project entries
- `collaborators_index.md` — added 5 new collaborator entries
- `raw/research/missed_projects.md` — marked completed items

## [2026-04-07] ingest | Six new W+K London projects

- **TK Maxx: Ridiculous Possibilities (2016)** — `projects/wk_tk_maxx_ridiculous_possibilities.md`. First W+K TK Maxx work. ECDs Iain Tait & Tony Davidson; CDs Hollie Walker & Freddie Powell; Creatives Paddy Treacy (CW) & Mark Shanley (AD), Pierre Jouffray, Kelly Satchell; Directors Traktor (Rattling Stick), Nadia Lee Cohen, Michal Pudelka, Tom Kingsley.
- **Honda: The Other Side (2015)** — `projects/wk_honda_the_other_side.md`. World's most awarded interactive campaign of 2015. D&AD Yellow Pencils. Press R to switch parallel stories. ECDs Kim Papworth & Tony Davidson (award-credited; Iain lightly involved); CDs Graeme Douglas & Scott Dungate; Director Daniel Wolfe (Somesuch); Interactive Stink Digital; DOP Robbie Ryan.
- **Three: Go Roam / Giraffe-amingo (May 2017)** — `projects/wk_three_go_roam.md`. CGI animal hybrid. ECDs Iain Tait & Tony Davidson; CDs Larry Seftel & David Day; Creatives Katy Edelsten & Chloe Cordon; Director The Perlorian Brothers (MJZ); VFX The Mill.
- **Three: Real 5G (Feb 2020)** — `projects/wk_three_real_5g.md`. Sequel to Phones Are Good. ECDs Iain Tait & Tony Davidson; CD Hollie Walker; Creatives Adam Newby & Will Wells; Director Ian Pons Jewell (Academy Films); feat. Lewis Capaldi.
- **Sainsbury's: Nicholas the Sweep (Nov 2019)** — `projects/wk_sainsburys_nicholas_the_sweep.md`. Christmas 2019; #2 most popular Christmas ad on YouTube. CDs Dan Norris & Ray Shaughnessy; Creatives Tom Bender, Tom Corcoran, Tomas Coleman, Mat Kramer; Director Ninian Doff (Pulse Films); Post Time Based Arts.
- **Formula 1: NEEEUM (March 2019)** — `projects/wk_f1_neeeum.md`. Chemical Brothers sonic identity; "We've Got To Try" at 15,000 BPM; 1.7M views in 3 weeks; 70+ publications. CDs Dan Norris & Ray Shaughnessy; Creatives Tom Reas, Liam Riddler, Chris Gray; Director Ninian Doff (Pulse Films).
- **Angry Birds 2 (July 2015)** — `projects/wk_rovio_angry_birds_2.md`. First W+K Rovio work. Global; 50M downloads in first month. Director François Rousselet (Riff Raff); Creatives Paddy Treacy, Philippa Beaumont, Mark Shanley, Artur Faria, David Goss; filmed in Bahamas.

## [2026-04-07] update | Ingress Prime: ADA vs. JARVIS — deep research pass

- **Rewritten:** `projects/wk_niantic_ingress_prime.md` — full credits, full AI system detail, context on truncated campaign run
- **Teaser film credits** confirmed from chrisboyle.co.uk: ECD Iain Tait & Tony Davidson; CD Darren Simpson; Creatives Adam Newby & Pete Browse; Producers Dom Felton & Iona Patterson; Director Chris Boyle; Production Private Island; Sound 720
- **Tool of NA AI ecosystem** documented: NLG neural net (retrained from player chat); personality graphs (gradient descent); propaganda image generator; reinforcement voting loop; campaign controller
- **Scale:** millions reached; hundreds of thousands contributed to AI training
- **Fate:** Ingress [Redacted] shut down Sept 30, 2019; campaign chapters never completed
- **New collaborators:** `darren_simpson.md`, `adam_newby.md`; updated `chris_boyle.md`, `pete_browse.md`
- **Raw research:** `raw/research/ingress_prime_ada_vs_jarvis_2026-04-07.md`

## [2026-04-07] research | Ingress Prime — ADA vs. JARVIS (Niantic / W+K London, 2018)

- **Raw file:** `raw/research/ingress_prime_ada_vs_jarvis_2026-04-07.md`
- **Sources verified:** Tool of NA case study (full technical detail), Chris Boyle director portfolio (full credits), Darren Simpson CD portfolio (campaign description + propaganda GIFs), Adam Newby/Joe Koprowski profiles, killedbyniantic.com (game status), Variety/Business Insider (launch press)
- **Key finding — credit correction:** Teaser film creatives are **Adam Newby & Peter Browse** (not Joe Koprowski). ECD: Tony Davidson & Iain Tait. CD: Darren Simpson. Director: Chris Boyle. Producer: Helen Power. Production: Private Island (edit/animation/VFX). Sound: 720.
- **Technology (Tool of NA built):** NLG engine, personality graphs (real-time gradient descent), chat interaction system, content generator (parameterized propaganda imagery), reinforcement learning system (user voting → neural net training), full campaign controller
- **Scale:** Millions reached; hundreds of thousands contributed to AI training
- **Game status:** Ingress Redacted (old client) shut down September 30, 2019 — campaign likely cut short. Ingress Prime still technically live 2026.
- **Gaps:** No awards found; no trade press coverage of the campaign itself; YouTube video URL not found; platforms for chatbot not named; Joe Koprowski's specific role unverified; Medium article blocked

## [2026-04-07] ingest | Pokémon GO Travel: Global Catch Challenge (November 2017)

- **New project:** `projects/wk_pokemon_go_global_catch_challenge.md`
- **Campaign:** W+K London × Niantic; 3 influencers sent to Japan (Tokyo, Fuji, Kyoto, Nara, Tottori); global community challenge to catch 3 billion Pokémon in 7 days; community hit 3.36B; Ho-Oh unlocked for first time globally
- **Influencers:** IHasCupquake (Tiffany Garcia), Coisa de Nerd (Leon), Rachel Quirico
- **Tottori:** 89,000 trainers at Safari Zone finale; US$16M tourism revenue in 3 days
- **Creatives:** Pete Browse confirmed (uploaded case study to personal Vimeo); Joe Koprowski possible partner (phonetic match for "Joe Kapowski" — unconfirmed)
- **Awards:** Webby 2018 (Best Community Engagement) + Cannes Lions 2018 (both entered; win status unconfirmed)
- **New collaborator:** `collaborators/pete_browse.md` — creative at W+K London, later CD at adam&eveDDB
- **YouTube:** 3 confirmed Pokémon GO Travel videos + W+K case study on Vimeo (vimeo.com/289157518)

## [2026-04-07] update | Pokémon GO City Celebrations — deep research pass

- **Updated:** `projects/wk_pokemon_go_city_celebrations.md` — deep research agent retrieved Niantic blog, W+K London case study + blog post, Creativepool, The Drum, LBBonline, Campaign Live (paywalled), Ad Age (credits paywalled)
- **Confirmed:** First-ever ATL campaign for Pokémon GO; W+K agency appointment announced same day (June 8, 2017); W+K Portland handled global media; billboards activated as in-game PokéStops
- **Iain Tait quote** verified across Niantic blog + Creativepool
- **Game context added:** 750M downloads, 65M active players, 7.5M US downloads first week
- **Billboard formats:** Trafalgar Square 48-sheet crosstrack; London 6-sheet; NY vertical 1080×1920; NY "legendary catches"
- **Image asset URLs** added from W+K London CDN and Niantic blog
- **Credits gap:** No below-ECD credits in any public source; Campaign Live (Omar Oakes) and Ad Age (Alexandra Jardine) both paywalled
- **Awards:** No confirmed wins or shortlists found
- **Raw research:** `raw/research/wk_pokemon_go_deep_2026-04-07.md`

## [2026-04-07] update | Dodge Tent Event — Matt Moore credit confirmed

- **Updated:** `projects/wk_dodge_tent_event.md` — Matt Moore added as confirmed creative credit
- **Evidence:** Matt Moore uploaded the "Invisible Monkey" spot to his personal YouTube channel (`youtube.com/watch?v=m7vEQaw3egU`) with first-person framing: *"PETA demanded we take the chimp out of our TV ad — so we did."*
- **Gap remaining:** Matt Moore's specific role (CW or AD) not confirmed in any public source
- **Additional context added:** W+K Portland co-ECDs at the time were Mark Fitzloff and Susan Hoffman
- **Press links updated:** Adweek AdFreak, Jalopnik, LA Times all URL-corrected to specific articles

## [2026-04-07] ingest | Coke Polar Bowl (Super Bowl XLVI, 2012)

- **New project:** `projects/wk_coca_cola_polar_bowl.md` — Super Bowl XLVI, Feb 5 2012; CokePolarBowl.com; live second-screen with animated polar bears puppeted via Xbox controllers from MLB Advanced Media control room; Framestore (CGI + puppeting tech); Animal Logic (TV spot); 9M streams, 28-min avg view time
- **Credits confirmed:** Global Interactive ECD Iain Tait; ECDs Mark Fitzloff + Susan Hoffman; CDs Hal Curtis + Jeff Gillette (NOT Geoff); CW Heather Ryder + AD Chris Thurman (puppeted bears live); EP Ben Grylewicz
- **Awards:** Cannes Gold (Direct FMCG) + Silver (Media) + 3 Bronze; ANDY Silver x2; Internationalist Grand Prix; WARC Creative 100
- **Referenced in:** "The Idea Writers" (Palgrave Macmillan); 2024 Ad Age Super Bowl retrospective

## [2026-04-07] update | Dom Felton, Jackie Jantos, Nexus Studios

- **New collaborators:** `dom_felton.md` (EP W+K London since Nov 2010; producer on Maroon 5 + all Niantic projects), `jackie_jantos.md` (Coca-Cola client 2011; Spotify VP Brand → Hinge CEO Dec 2025), `nexus_studios.md` (formerly Nexus Interactive Arts; Hellicar & Lewis were directing duo on their roster for Maroon 5)
- **Updated:** `wk_coca_cola_maroon_5_24hr.md` — added Dom Felton, Jackie Jantos, Nexus Studios; clarified Nexus/H&L relationship
- **Updated:** all 3 Niantic projects — Dom Felton added as producer

## [2026-04-07] update | Google An Awesome World — Wayback Machine dig

- **Original YouTube ID recovered:** `oZmtwUAD1ds` — found via Wayback Machine raw Blogger HTML (`if_` flag); 1,090 captures Oct 2012–Aug 2025; week-one stats: 68,784 views, 1,454 likes
- **Full title confirmed:** "Google Chrome: An Awesome World"
- **Upload date:** October 7, 2012 (one day before Chrome Blog post)
- **Dallas Clayton Tumblr (Oct 11, 2012):** "Google made an ad about me and my book"
- **veryawesomeworld.com:** "Written by Dallas Clayton and made with some friends at Google"
- **David Gelb confirmed:** listed in his Independent Media Inc bio; title and project file updated
- **Surviving copy:** `youtube.com/watch?v=C3Aufan71D0` (user-provided)
- **Removed from index:** `food_hinge_ai_dating_coach.md` (moved to confidential)

## [2026-04-07] ingest | W+K London — Honda, Bud Light/Tyrrells, National Trust, Sainsbury's

- **Ingested:** `projects/wk_honda_dream_makers.md` — ECDs Tait/Davidson/Papworth; CDs Alija/Sampedro; Time Based Arts directing+production+post; DOP Daniel Landin; 750mph sound; Channel 4 idents 12 months; YouTube confirmed
- **Ingested:** `projects/wk_brand_establishments.md` — Bud Light: "Keep It Bud Light", OOH March + TV Oct 2017, dir Ali Ali (Sonny London), CD Ray Shaughnessy; Tyrrells "Absurdly Good": Peter Serafinowicz VO, Dog & Rabbit dirs, creatives Newby/Wells/Kouts, £2.5m budget
- **Ingested:** `projects/wk_national_trust_everyone_needs_nature.md` — Sept 7 2020; 6 TVCs ITV/C4/Sky; dir Anthony Dickenson (All Mighty Pictures); CD Flo Heiss; 5 named creatives; Time Based Arts post; String and Tins sound
- **Ingested:** `projects/wk_helping_everyone_eat_better.md` — May 26 2021; retired "Live Well for Less"; dir Filip Nilsson (Object & Animal); Stephen Fry narrator; CD Darren Simpson; senior creatives Freddy Taylor + Philippa Beaumont; Untold Studios VFX; 750mph sound; 3.2M YouTube views

## [2026-04-07] ingest | W+K London — Niantic trilogy

- **Ingested:** `projects/wk_pokemon_go_city_celebrations.md` — June 8 2017; first-ever OOH for Pokémon GO; billboards = PokéStops + live catch data; 16M NYC / 17.5M London / 32.2M Tokyo at launch; Iain named in Niantic blog
- **Ingested:** `projects/wk_niantic_ingress_prime.md` — "ADA vs JARVIS"; Tool of North America built AI ecosystem; millions reached, hundreds of thousands trained the AIs; Campaign Magazine 2019 landmark citation
- **Ingested:** `projects/wk_harry_potter_wizards_unite.md` — full credits: CDs Scott Dungate + Sophie Bodoh; launch film dir Tom Green (Stink); teaser dirs McGregor + Montiel; Abdou Cisse + Akwasi Poku (launch creatives); DOP Ben Kracun; The Mill VFX; Factory Studio sound

## [2026-04-07] ingest | W+K Portland — Dodge Tent Event + Coca-Cola Maroon 5

- **Ingested:** `projects/wk_dodge_tent_event.md` — Dodge invisible monkey 2010; chimp Suzy + Michael C. Hall voiceover; NMA covert amplification confirmed; Kristin Starnes (client); no individual W+K credits found
- **Ingested:** `projects/wk_coca_cola_maroon_5_24hr.md` — 22 March 2011; "Is Anybody Out There" ft. PJ Morton; Hellicar & Lewis interactive projection (openFrameworks); 139 countries; 20M+ Facebook reach; Iain named as Global Interactive CD in Campaign + The Drum
- **Updated:** `projects/google_an_awesome_book.md` — YouTube video confirmed at https://www.youtube.com/watch?v=C3Aufan71D0; David Gelb director now confirmed (Independent Media Inc); removed "unconfirmed" caveat

## [2026-04-06] ingest | POKE London agency file — deep update

- **Major rewrite:** `agencies/poke_london.md` — founding year corrected to 2001; Mother London 50.01% stake + basement origin confirmed; Shoreditch/Boundary Street location; full awards table 2002–2009; full client roster (25+ clients); NMA+MW Agency of the Year 2008; Revolution best UK interactive agency 2005+2006; "number one twice in 7 years" (Design Museum 2010); Boards Magazine defining works confirmed as Rubberduckzilla/Orange Unlimited/Room 10101; Simon Waterfall departure Sept 2009; Iain Tait departure March 2010; POKE NY → Makeable (management buyout pre-Publicis); Emma Pueyo as successor CD
- **Updated:** `collaborators/simon_waterfall.md` — added D&AD President 2008 (youngest/first digital), RDI Sept 2008, BAFTA history (Deepend 2000 + POKE 2005 McQueen), Deepend origin, departure timeline
- **Updated:** `collaborators/andrew_zolty.md` — added frontmatter schema, confirmed as creator of Baker Tweet (April 2009)
- **Research agent running:** Dallas Clayton / An Awesome Book film director (user confirms there was a film; director went on to make Chef's Table)

## [2026-04-06] deep-research | POKE London agency — founding to 2009

- **Raw research saved:** `raw/research/poke_london_agency_2026-04-06.md`
- **Key findings:** Founding year 2001 confirmed; POKE grew from Mother's basement; Mother held 50.01% stake; Shoreditch location confirmed (across from Albion bakery, Boundary Street); full awards list reconstructed from Waterfall CV + Design in Britain book; NMA+MW Agency of the Year 2008; BAFTA for AlexanderMcQueen.com (2005); "number one agency twice in past seven years" (Design in Britain); Iain Tait on WEF Global Agenda Council 2008–09; BakerTweet created April 2009 by Andrew Zolty; Boards Magazine (March 2010) names Oasis Rubberduckzilla, Orange Unlimited, Nokia Room 10101 as defining POKE works; Simon Waterfall left September 2009

## [2026-04-06] ingest | Google Chrome Campaign + An Awesome Book

- **Ingested:** `projects/google_chrome_campaign.md` — "For Everyone" platform extended to Chrome browser 2013; TV spots: "Family Guy" (Stewie, 7.7M views, topped Ad Age viral chart) + "Lost Directions" (Rawhide); 4 spots total per CNET; BBH vs 72andSunny attribution ambiguous (iSpot credits BBH; Ad Age confirms 72andSunny picked up account Feb 2013)
- **Ingested:** `projects/google_an_awesome_book.md` — Dallas Clayton adaptation, Chrome Web Store, 17 languages, Oct 8 2012; no named GCL credits found in open sources

## [2026-04-06] ingest | Chromebook: For Everyone + housekeeping

- **Ingested:** `projects/google_chromebook_for_everyone.md` — full rewrite with correct schema; credits confirmed from Jake Dubs portfolio (ECD: Iain Tait; creatives: Jeff Baxter, Tristan Smith, Charles Hodges, Todd Lamb, Natalie Dennis, Jake Dubs; director: Jessica Brillhart; music: The Death Set); Gretel = Times Square 9-screen animation system; 72andSunny = platform continuation from Feb 2013
- **New collaborator:** `collaborators/jessica_brillhart.md`
- **Removed** `google_ad_tech_research.md` from `index.md` — moved to confidential

## [2026-04-06] update | POKE London agency file

- **Rewrote** `agencies/poke_london.md` — added correct frontmatter schema, full co-founder list with linked collaborator profiles, key staff section, complete chronological project list (13 projects, 2002–2009), awards & recognition section, known client roster, culture & approach section
- **Deep research agent running** (ac5815e84882924ec) — raw output will go to `raw/research/poke_london_agency_2026-04-06.md`; will update agency file once complete

## [2026-04-06] rewrite | Kate Moss for Topshop

- **Research:** agent a9b1d6b847e9ba2ec; raw research saved to `raw/research/kate_moss_topshop_2026-04-06.md`
- **Key finds:** Campaign Live (3 Dec 2007) explicitly names POKE as builder of Topshop digital work (Kate Moss microsite + Fashion Fix Facebook app); Oxford Street cultural moment confirmed across Guardian, TIME, CNN, CBS; Webby Award claim **UNCONFIRMED** — Simon Waterfall's CV has no 2007 entry, likely confusion with 2005 Alexander McQueen Webby (Best Fashion)
- **File rewritten:** `projects/poke_kate_moss_topshop.md` — corrected frontmatter schema, added `## Collaborators` and `## References & Media`, flagged unverified Webby claim, removed stale raw source references

## [2026-04-06] research + ingest | POKE Projects — Batch 6 (Global Rich List, Very Public Art Exhibition)

- **Research:** 2 parallel agents; raw research saved to `raw/research/global_rich_list_2026-04-06.md`, `raw/research/very_public_art_2026-04-06.md`
- **Key GRL finds:** Launch confirmed September 2003 (WTO Cancun summit timing); POKE self-initiated then Care International adopted it; Iain + Nik Roope co-originated concept; One Show Gold 2004 + Viral Awards 2004 winner + D&AD Finalist confirmed (Simon Waterfall CV + Simon Källgård portfolio); 120,000 visitors first week (WIRED, 11 Sept 2003); 1.5M visits by Oct 2005; £8,000+ raised; still live in 2026; POKE rebuilt for 10th anniversary (2013) with World Bank Data API; cited in academic/legal scholarship
- **Key VPAE finds:** Physical exhibition in Selfridges Oxford Street shop windows; SMS bidding for British art from the pavement; c. April 2003; BIMA 2003 + One Show New York Gold 2004 confirmed (Simon Waterfall CV); Design Week 3 April 2003 article confirms "creative elements designed by Poke. Venue: Selfridges, 400 Oxford Street"
- **Projects ingested:** `projects/poke_global_rich_list.md`, `projects/poke_very_public_art_exhibition.md`
- **New collaborator profiles (1):** simon_kallgard
- **Naked Communications** added to Warholiser collaborators (confirmed by Iain)
- **Jason Fox** confirmed as surname by Iain — collaborator profile created, Rubberduckzilla updated

## [2026-04-06] research + ingest | POKE Projects — Batch 5 (Rubberduckzilla)

- **Primary source:** https://www.crackunit.com/2009/06/12/aaaaaaargh-rubberduckzillacom/ — Iain's own crackunit post fetched directly
- **Research:** Parallel agent; raw research saved to `raw/research/rubberduckzilla_2026-04-06.md`
- **Key finds:** TV campaign = Mother London (dir. Joseph Kahn / HSI) — explicitly NOT POKE; POKE built AR games at rubberduckzilla.com (FLARToolKit) + The Sun newspaper takeover (front cover = AR marker); Marketing Week (7 May 2009) confirms "digital element created by Poke"; POKE AR demo on YouTube confirmed; Gavin Fox confirmed as CD at POKE via Digiday 2013; Katie Marcus confirmed from Iain; Jason surname still TBD
- **No confirmed awards** for POKE's digital component
- **Project ingested:** `projects/poke_rubberduckzilla.md`
- **New collaborator profiles (2):** gavin_fox, katie_marcus

## [2026-04-06] research + ingest | POKE Projects — Batch 4 (Room 10101, Orange Unlimited)

- **Research:** 2 fresh agents (previous session agents timed out without saving); raw research saved to `raw/research/room_10101_2026-04-06.md`, `raw/research/orange_unlimited_2026-04-06.md`
- **Key Room 10101 finds:** BIMA 2004 Best Arts and Culture confirmed (Simon Waterfall CV — listed as "Room 101", confirmed abbreviation); W+K London/Boards Magazine 2010 verbatim quote: "Nokia (Room 10101)" as one of three defining POKE works; no video, no contemporaneous press archived publicly; Designer's Block = fringe event that became part of London Design Festival
- **Key Orange Unlimited finds:** Official title "Unlimited — Good Things Should Never End"; launched Nov 2007; Campaign Annual 2007 authoritative credits: Nik Roope (creative lead), Derek McKenna (Flash dev), Nicky Gibson (AD), Julie Barnes (creative), Rex Crowle (animator), Marius Watz (generative), Nick Ryan (audio); Webby 2008 Design Aesthetic Winner + Cannes Silver + ADC Gold Cube + BIMA Overall Winner + Revolution Grand Prix; Campaign Annual 2007 #8 + Ad Age best digital 2007; Wayback Machine capture exists (Apr 2008, Flash-based); Nicky Gibson has MoMA artist page + Design Museum exhibition credits (Orange Unlimited in her client list — museum attribution unconfirmed at project level)
- **Attribution confirmed:** Iain = concept originator/co-founder; Nik Roope = creative lead/craft/public face; neither should be sole-credited. Iain not in Campaign Annual creatives list.
- **Museum claim clarified:** Nik Roope's MoMA/V&A collection = Plumen 001 lightbulb (separate project). Orange Unlimited museum claim = possibly via Nicky Gibson's MoMA artist page — unconfirmed without manual check.
- **Projects ingested:** `projects/poke_room_10101.md`, `projects/poke_orange_unlimited.md`
- **New collaborator profiles (5):** nicky_gibson, derek_mckenna, rex_crowle, marius_watz, nick_ryan

## [2026-04-06] research | Room 10101 (Nokia / Designer's Block 2004)

- Ran targeted web research pass on Room 10101 for POKE London career archive.
- Re-verified Simon Waterfall CV (waterfall.co.uk/cv/talks-awards): exact BIMA 2004 listing confirmed as "Best Arts and Culture: Room 101" (truncated from Room 10101).
- Re-verified W+K London / Boards Magazine 2010 article: "Nokia (Room 10101)" citation confirmed verbatim.
- No video, no contemporaneous press, no Wayback Machine project pages located.
- Appended re-verification notes to `raw/research/room_10101_2026-04-06.md`.

## [2026-04-06] research + ingest | POKE Projects — Batch 3 (Warholiser, Spot the Bull, Orange Talking Point)

- **Research:** 3 parallel agents; raw research saved to `raw/research/warholiser_2026-04-06.md`, `raw/research/spot_the_bull_2026-04-06.md`, `raw/research/orange_talking_point_2026-04-06.md`
- **Key Warholiser finds:** Exhibition confirmed as "Warhol" at Tate Modern, 7 Feb–1 Apr 2002; BIMA 2002 confirmed (Simon Waterfall CV); scale: thousands uploaded, hundreds of thousands visited (Nik Roope, Shots 2016); cited in Faris Yakob's *Paid Attention* (2015 + 2021 editions); contemporary Swedish newsletter URL confirms it was live 13 Feb 2002
- **Key Spot the Bull finds:** Three confirmed years: 2007, 2008, 2009 (not earlier — no public record before May 2007); LIA 2008: two Gold wins (Online Games + Best Use of Interactivity); #1 in Campaign Annual 2007 Top 10 Digital Ads; Unit 9 confirmed as production partner; Oliver Wright (EP) confirmed via YunoJuno; 2025 Mando Agency named it one of "10 Best Ever Promotions" — cited as direct inspiration for Walkers "When it Rains"
- **Key Talking Point finds:** Webby Award (Judges' Award) confirmed, 10th Annual Webbys, May 2006, Telecommunications category; citation: "Pioneering social Media for Brand Engagement"; The Guardian 9 May 2006 + Campaign 29 Sept 2006 coverage confirmed; POKE operated as digital sister agency to Mother (Orange account)
- **Projects ingested:** `projects/poke_warholiser.md`, `projects/poke_spot_the_bull.md`, `projects/poke_orange_talking_point.md`
- **Malice Box update:** Added Tim Wright (freelancer, identified from crackunit blog) to collaborators section
- **New collaborator profiles (6):** simon_waterfall, nick_farnhill, oliver_wright, unit9, tim_wright, and added Warholiser section to nik_roope context
- **index.md:** Added 3 new POKE projects
- **Room 10101 + Orange Unlimited:** Research agents still running; ingestion pending



## [2026-04-06] research | Google Racer — Deep Dive

- **Raw research file saved:** `raw/research/google_racer_2026-04-06.md`
- **Searches run:** 16 parallel searches across Cannes Lions, Active Theory, press coverage, awards, Giorgio Moroder soundtrack, GitHub, FWA, Webby Awards, SoDA Report.
- **Key finds:**
  - Cannes Lions 2014: Gold Mobile Lion + Bronze Mobile Lion, Category A04 (Innovative technology for mobile) — CONFIRMED with full entry details. Agency: Google Creative Lab / Active Theory.
  - Active Theory's web.dev/Google Developers technical case study found and summarised: https://web.dev/case-studies/racer
  - HUSH (design studio) identified as previously uncredited collaborator — built the physical Google I/O installation.
  - Plan8 confirmed as sound design (in Active Theory's case study).
  - Giorgio Moroder's "Racer" fully documented: official release May 15, 2013, Label: Giorgio Moroder Enterprises. On official credits at giorgiomoroder.com.
  - FWA Site of the Day (installation); Tomorrow Awards Nominee (installation) confirmed.
  - Webby Awards + CLIO Awards referenced in SoDA Report 2014 snippet but not individually confirmed.
  - Metrics confirmed: 3.2M website visitors, 70% mobile/tablet (Cannes submission).
  - Press confirmed: The Verge, CNN Money, CNET, Mashable, Consequence of Sound.
  - Developer community reverse-engineered server: github.com/Technohacker/recar and github.com/allancoding/racer.
- **Not found:** Giorgio Moroder Brooklyn SoundCloud recording; physical vinyl 12-inch release (not independently confirmed).

## [2026-04-06] ingest | Tier 1 Projects — Full Rewrite + Collaborator Profiles

- **Projects rewritten (all 4 non-Baker Tweet Tier 1 projects):**
  - `projects/wk_old_spice_responses.md` — YAML frontmatter, 15 collaborators, full awards (Cannes GP Film, D&AD 2Y+1G, 3 One Show Golds, Webby, Grand Effie), full metrics, 13+ verified URLs
  - `projects/wk_nothing_beats_a_londoner.md` — Titanium + Grand Prix + Gold Film + 2 Silvers at Cannes; 7 D&AD Yellow Pencils; LNDR trademark dispute documented; Drake/Sadiq Khan cultural legacy
  - `projects/wk_f1_global_rebrand.md` — W+K as "first ever global creative agency" for F1; Richard Turley identity lead; Marc Rouault typefaces; Flamingo Research; 2018 metrics (+10% TV viewers, +53% social)
  - `projects/wk_nike_better_world.md` — First mainstream parallax scrolling website; Iain's role = executive oversight; Seth Weisfeld ICD; Ian Coyle + Duane King interaction leads
- **Raw research files saved:** `raw/research/old_spice_responses_2026-04-06.md`, `raw/research/nothing_beats_a_londoner_2026-04-06.md`, `raw/research/f1_global_rebrand_2026-04-06.md`, `raw/research/nike_better_world_2026-04-06.md`
- **New collaborator profiles (18 created):** tony_davidson, richard_turley, marc_rouault, seth_weisfeld, ian_coyle, duane_king, ryan_bolls, jason_bagley, isaiah_mustafa, eric_baldwin, mark_fitzloff, susan_hoffman, craig_allen, eric_kallman, mark_shanley, paddy_treacy, tom_bender, tom_corcoran
- **collaborators_index.md** updated with all new entries across 4 new sections (Creative Directors & Copywriters, Talent & Performers) and additions to existing sections
- **Media downloads (background):** Old Spice "The Man Your Man Could Smell Like" (YouTube), F1 "Engineered Insanity" (Vimeo 261057373), Nothing Beats a Londoner (YouTube)

## [2026-04-06] research + ingest | Tier 2 Projects — Batch 1 (Balloonacy, Malice Box, Racer, Roll It)

- **Research:** 4 parallel agents; raw research saved to `raw/research/balloonacy_2026-04-06.md`, `raw/research/malice_box_2026-04-06.md`, `raw/research/google_racer_2026-04-06.md`, `raw/research/roll_it_2026-04-06.md`
- **Context from Iain:** Balloonacy — his original idea, CD/ECD, purely in-house, i-level as media partner only, follow-up ~2010 by Martin Rose; Racer — Giorgio Moroder connection came from a producer proactively contacting him; Roll It — James Cooper was CD, Iain ECD, PA Consulting NOT involved
- **Key Balloonacy corrections:** Metrics updated to 40,000–42,000 pilots, 63 million online miles; Webby 2009 WIN confirmed (Websites/Telecommunications); MediaGuardian Innovation Award 2009 WIN confirmed; 9 total awards per Orange press release; 3 crackunit posts from June 2008 all live
- **Key Racer additions:** Gold Mobile Lion + Bronze Mobile Lion (Cannes 2014, Category A04) — both confirmed; HUSH identified as new collaborator (Google I/O physical installation); Active Theory web.dev case study; Giorgio Moroder Brooklyn SoundCloud mix found: soundcloud.com/giorgiomoroder/giorgio-moroder-live-at-deep (at 19:15 he plays the Racer theme); 3.2M visitors, 70% mobile
- **Key Roll It corrections:** PA Consulting CONFIRMED ABSENT — removed; FWA triple win confirmed (Mobile SOTD, Site of Month, Cutting Edge — July 2013); Justin Gitlin/Cacheflowe identified as Mode Set dev lead
- **Projects ingested:** `projects/poke_balloonacy.md`, `projects/poke_malice_box.md`, `projects/google_racer.md`, `projects/google_roll_it.md`

## [2026-04-06] research + ingest | Tier 2 Projects — Batch 2 (Coder, Wearing Gillian, WWF Endangered Emojis, Phones Are Good)

- **Research:** 4 parallel agents; raw research saved to corresponding `raw/research/` files
- **Context from Iain:** Coder — Jason Striegel was the primary creative force, Iain was his ECD and champion; Wearing Gillian — Gillian approached W+K as a neighbour, Iain introduced her to deepfake, no commercial client; WWF — "Jason and Yoris" = Jason Scott + Joris Philippart; Phones Are Good — director is Ian Pons Jewell (speech-to-text "Iain Pond's Jules"), production is Friend London (not Blink), Tom Bender + Tom Corcoran as creatives (Iain's first instinct was correct)
- **Key Coder findings:** GitHub 2,400 stars, 269 forks; archived (not deleted) August 18, 2025; TechCrunch launch coverage names Striegel and Baxter; no awards — never entered; YouTube launch video confirmed
- **Key Wearing Gillian findings:** Exhibition traveled to Guggenheim, MoMA (acquired), ACMI Melbourne — not just Cincinnati; Fast Company article confirmed with Iain and Wearing quoted; Chris Boyle (Shots.net 2025): "That ended up in MoMA"
- **Key WWF findings:** Creative team confirmed as Jason Scott (CW) + Joris Philippart (AD); launched 12 May 2015; 559k mentions, 59k signups; technical backend by Cohaesus/Coherence; no specific Cannes wins confirmed from open sources
- **Key Phones Are Good findings:** Director confirmed Ian Pons Jewell via Friend London (not Blink); Hollie Walker confirmed as Creative Director; One Show 2019 WIN; Creative Circle VFX/CGI + Grade wins; ~£189M incremental revenue; Valentine's Day extension + Reuben Dangoor gallery + 6-city retail takeovers; sequel "Real 5G" (2020)
- **Projects ingested:** `projects/google_coder.md`, `projects/wk_gillian_wearing_deepfake.md`, `projects/wk_wwf_endangered_emojis.md`, `projects/wk_three_phones_are_good.md`
- **New collaborator profiles (4):** hollie_walker, ian_pons_jewell, jason_scott, joris_philippart

## [2026-04-06] research + ingest | Awards Juries Deep Dive

- **[2026-04-06]** Ran deep jury research using parallel Apify agents (24 searches across both agents).
- **Key finds:** Cannes Cyber Jury President 2012 (confirmed across 6+ sources with full Grand Prix speech quotes); Cannes Cyber jury member 2009; Cannes Titanium & Integrated 2011; One Show Interactive Jury Chair 2010; One Show 2014; Andy Awards 2011/2012/2014 (official archive); Clio Awards 2007; D&AD (c.2008); LIA Jury Chair; Lovie Awards IADAS member 2018+; ADC 105 AI Visual Design 2026; Ad Black Sea Chairman 2024; AAF Hall of Achievement inductee (2010 cohort).
- **Not confirmed:** Meta Creative Council, BIMA jury, Eurobest, Cannes 2015/2016/2017.
- **Ingest:** Fully rewrote `industry/boards_and_juries.md` with verified timeline and all sources. Created individual pages for Cannes 2012 Jury President speech and Andy Awards judging diary.
- **New pages:** `industry/talks/cannes_cyber_lions_jury_president.md`, `industry/writing/andys_judging_diary_2012.md`
- **Raw research saved:** `raw/research/awards_juries_2026-04-06.md`

## [2026-04-06] research + ingest | Broad Iain Tait Research — Talks, Writing, Interviews, Podcasts

- **[2026-04-06]** Ran broad `/research iain tait` — deep dive for all missing interviews, talks, videos, podcasts, and writing.
- **Key finds:** Fast Company Brand New World podcast (2025), Campaign "Dan Wieden: the quiet titan" (2022), PSFK "10 Reasons Why Digital is Better than Advertising" (~2007), CR "Creativity Sucks!" podcast (2023), CR "Creative Leaders on Beginnings" (2019), Playful London "High Scores" (~2008), D&AD "I Wish I'd Done That" film (2013), Here London "A Crowd of Terrible Content" (2015), Ad Age W+K→Google piece (2012), W+K partner announcement (2011), Boards Magazine W+K interview (2010).
- **New wiki structure:** Created `industry/talks/`, `industry/podcasts/`, `industry/writing/`, `industry/interviews/` directories for individual pages per appearance.
- **Created 15 individual pages:** 8 talks, 2 podcasts, 1 writing, 4 interviews.
- **Media archival:** Established `raw/media/` directory. Archived 2 YouTube videos (Here London 321MB, W+K interview 51MB) via yt-dlp. Vimeo downloads (PSFK, Playful, Under the Influence, Radiohead) attempted with impersonation.
- **Research skill updated:** Added yt-dlp media archival section and individual page creation to ingest checklist.
- **Updated:** `index.md` with new Talks, Podcasts, Writing, and Interviews subsections. Cross-linked `industry/podcasts_and_speaking.md` and `industry/publications.md` to individual pages.
- **Raw research saved:** `raw/research/broad_iain_tait_2026-04-06.md`

## [2026-04-06] research + ingest | Baker Tweet Deep Dive

- **[2026-04-06]** Ran `/research baker tweet` — first test of the new research skill. Used Apify RAG web browser to search across 15+ queries covering awards, press, video, and cultural legacy.
- **Findings:** 13 verified press URLs, 2 Vimeo videos, ADC Merit confirmed, MoMA "Talk to Me" exhibition (2011) discovered — major cultural validation not previously in the wiki.
- **Ingest:** Rewrote `projects/poke_baker_tweet.md` with YAML frontmatter, full References & Media section, corrected attribution (Nik Roope as concept originator), MoMA exhibition, and all verified URLs.
- **New collaborator:** Created `collaborators/nik_roope.md` — POKE co-founder, BakerTweet originator, Lovie Awards jury chair. Added to collaborators index.
- **Raw research saved:** `raw/research/baker_tweet_2026-04-06.md`

## [2026-04-06] projects | W+K London Niantic Campaigns

- **[2026-04-06]** Initiated Phase 3: Synthesized Wieden+Kennedy London (Niantic: Pokémon GO, Harry Potter). Archival search established role as ECD bridging out-of-home events to digital metrics.
- **[2026-04-06]** Initiated Phase 4: Synthesized Wieden+Kennedy Portland masterworks (Old Spice, Nike Better World, Dodge). Mapped the pivot to real-time social response and the advent of parallax web design.
- **[2026-04-06]** Initiated Phase 5: Instantiated Google Creative Lab portfolio (Roll It, Racer, Chromebooks) detailing Chrome Experiment legacy. Proceeded to run "Levels Deep" injection on Portland files.

## [2026-04-06] projects | POKE London Deep-Dive (Batch 1)

- Completed thorough research and ingestion for 3 POKE London projects: Orange Balloonacy, The Malice Box, Kate Moss for Topshop.
- Synthesized `projects/poke_balloonacy.md`, `projects/poke_malice_box.md`, `projects/poke_kate_moss_topshop.md`.
- Created `agencies/poke_london.md` and updated `index.md` structure to index them.

## [2026-04-06] init | Wiki Scaffolding

- Instantiated directory structure, `CLAUDE.md`, `index.md`, and `log.md`.
- Read Initial `idea.md` spec.
-## Actions Taken
- **Phase 7 (Forensic Collaboration Pivot):** Created the `collaborators/` directory to track humans independently from projects. Built profiles for Chris Boyle (Private Island), Cookie (POKE Designer), and Giorgio Moroder (Musician). Retrofitted existing project files (`wk_gillian_wearing_deepfake.md`, `poke_baker_tweet.md`, `google_racer.md`) to cross-link to these new human profiles, solidifying the knowledge graph.
- **Phase 6 (Execution - W+K & POKE):** Synthesized Baker Tweet (POKE), Wearing Gillian, Nothing Beats a Londoner, F1 Rebrand, and Helping Everyone Eat Better (W+K London).

