#!/bin/bash
# batch_assets.sh — Download video + extract 6 frames for all projects
# Run from wiki root: bash raw/batch_assets.sh

MEDIA=/Users/iaintait/Code/llm-wiki/raw/media
YTDLP=/opt/homebrew/bin/yt-dlp
FFMPEG=/opt/homebrew/bin/ffmpeg
EXTRACT=/Users/iaintait/Code/llm-wiki/raw/extract_frames.sh
N=6

download_and_extract() {
  local SLUG="$1"
  local URL="$2"
  local YEAR="$3"
  local DIR="${MEDIA}/${SLUG}"

  mkdir -p "$DIR"

  # Skip if video already exists
  if ls "${DIR}/${YEAR}_"*.mp4 "${DIR}/${YEAR}_"*.webm 2>/dev/null | grep -q .; then
    echo "[$SLUG] video exists — extracting frames only"
    VID=$(ls "${DIR}/${YEAR}_"*.mp4 "${DIR}/${YEAR}_"*.webm 2>/dev/null | head -1)
  else
    echo "[$SLUG] downloading..."
    $YTDLP \
      -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]" \
      --merge-output-format mp4 \
      --write-info-json \
      --no-progress \
      -o "${DIR}/${YEAR}_${SLUG}.%(ext)s" \
      "$URL" 2>&1 | grep -E "Destination|Merging|ERROR|error" || true
    VID=$(ls "${DIR}/${YEAR}_${SLUG}".mp4 2>/dev/null | head -1)
  fi

  if [[ -z "$VID" ]]; then
    echo "[$SLUG] ✗ no video found after download"
    return
  fi

  # Remove old frames if re-running
  rm -f "${DIR}/${YEAR}_${SLUG}_frame_"*.jpg

  echo "[$SLUG] extracting $N frames from $(basename $VID)..."
  bash "$EXTRACT" "$VID" "${YEAR}_${SLUG}" "$N" "$DIR" 2>/dev/null
  echo "[$SLUG] ✓ done"
}

# ── Already downloaded flat — move to subfolder first ──
echo "=== Migrating pre-existing flat files ==="
for entry in \
  "wk_nothing_beats_a_londoner|2018_nothing_beats_a_londoner.webm|2018" \
  "wk_nothing_beats_a_londoner|2018_nothing_beats_a_londoner_bts.mkv|2018"; do
  SLUG=$(echo $entry | cut -d'|' -f1)
  FILE=$(echo $entry | cut -d'|' -f2)
  mkdir -p "${MEDIA}/${SLUG}"
  [[ -f "${MEDIA}/${FILE}" ]] && mv "${MEDIA}/${FILE}" "${MEDIA}/${SLUG}/" && echo "  moved $FILE → $SLUG/"
done
# Move companion files
for f in /Users/iaintait/Code/llm-wiki/raw/media/2018_nothing_beats_a_londoner*; do
  [[ -f "$f" ]] && mv "$f" "${MEDIA}/wk_nothing_beats_a_londoner/" 2>/dev/null || true
done

# ── Re-extract TK Maxx to 6 frames ──
echo "=== Re-extracting TK Maxx to 6 frames ==="
VID="${MEDIA}/wk_tk_maxx_ridiculous_possibilities/2016_tk_maxx_ridiculous_possibilities.mp4"
rm -f "${MEDIA}/wk_tk_maxx_ridiculous_possibilities/2016_tk_maxx_ridiculous_possibilities_frame_"*.jpg
bash "$EXTRACT" "$VID" "2016_tk_maxx_ridiculous_possibilities" 6 "${MEDIA}/wk_tk_maxx_ridiculous_possibilities"

# ── Extract frames for Nothing Beats a Londoner (already downloaded) ──
echo "=== Nothing Beats a Londoner (existing video) ==="
download_and_extract "wk_nothing_beats_a_londoner" "" "2018"

# ── Batch: W+K London ──
echo "=== W+K London ==="
download_and_extract "wk_wwf_endangered_emojis"          "https://www.youtube.com/watch?v=v26WWHUwj38"  "2015"
download_and_extract "wk_old_spice_responses"             "https://www.youtube.com/watch?v=owGykVbfgUE"  "2010"
download_and_extract "wk_dodge_tent_event"                "https://www.youtube.com/watch?v=m7vEQaw3egU"  "2011"
download_and_extract "wk_coca_cola_maroon_5_24hr"         "https://www.youtube.com/watch?v=IJdWn96ldOE"  "2012"
download_and_extract "wk_nike_better_world"               "https://www.youtube.com/watch?v=tAzaSZi8ycU"  "2011"
download_and_extract "wk_f1_global_rebrand"               "https://vimeo.com/261057373"                   "2017"
download_and_extract "wk_gillian_wearing_deepfake"        "https://vimeo.com/306770925"                   "2019"
download_and_extract "wk_pokemon_go_city_celebrations"    "https://www.youtube.com/watch?v=5mTB8ImPxtk"  "2017"
download_and_extract "wk_pokemon_go_global_catch_challenge" "https://vimeo.com/289157518"                "2017"
download_and_extract "wk_rovio_angry_birds_2"             "https://www.youtube.com/watch?v=175Bq3MSrWo"  "2015"
download_and_extract "wk_honda_dream_makers"              "https://www.youtube.com/watch?v=gmiQT_e0jRk"  "2018"
download_and_extract "wk_three_phones_are_good"           "https://vimeo.com/295647868"                   "2018"

# ── Batch: Google Creative Lab ──
echo "=== Google Creative Lab ==="
download_and_extract "google_roll_it"                     "https://youtube.com/watch?v=5XdzRoYo0wM"       "2013"
download_and_extract "google_racer"                       "https://vimeo.com/66268518"                     "2013"
download_and_extract "google_chromebook_for_everyone"     "https://www.youtube.com/watch?v=S95J5BowMmk"   "2012"
download_and_extract "google_coder"                       "https://www.youtube.com/watch?v=wH24YwdayFg"   "2013"
download_and_extract "google_an_awesome_book"             "https://www.youtube.com/watch?v=C3Aufan71D0"   "2012"

# ── Batch: POKE ──
echo "=== POKE ==="
download_and_extract "poke_baker_tweet"                   "https://vimeo.com/33021879"                     "2009"
download_and_extract "poke_rubberduckzilla"               "https://www.youtube.com/watch?v=5lbIBfN6dkI"   "2009"

echo "=== All done ==="
