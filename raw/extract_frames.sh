#!/bin/bash
# extract_frames.sh — Extract evenly-spaced frames from a campaign film
# Usage: ./extract_frames.sh <input_video.mp4> <output_prefix> [n_frames] [output_dir]
#
# Examples:
#   # Output to current directory:
#   ./extract_frames.sh 2019_nicholas.mp4 2019_sainsburys_nicholas_the_sweep 6
#
#   # Output to a project subfolder (recommended):
#   ./extract_frames.sh raw/media/wk_sainsburys_nicholas_the_sweep/2019_nicholas.mp4 \
#     2019_sainsburys_nicholas_the_sweep 6 \
#     raw/media/wk_sainsburys_nicholas_the_sweep

set -e

INPUT="$1"
PREFIX="$2"
N="${3:-6}"       # default 6 frames
OUTDIR="${4:-.}"  # default current directory

if [[ -z "$INPUT" || -z "$PREFIX" ]]; then
  echo "Usage: $0 <input_video.mp4> <output_prefix> [n_frames] [output_dir]"
  exit 1
fi

FFMPEG=/opt/homebrew/bin/ffmpeg
mkdir -p "$OUTDIR"

# Get duration in seconds
DURATION=$($FFMPEG -i "$INPUT" 2>&1 | grep Duration | awk '{print $2}' | tr -d , | awk -F: '{print $1*3600 + $2*60 + $3}')
echo "Duration: ${DURATION}s — extracting ${N} frames → ${OUTDIR}/"

# Extract frames at evenly-spaced intervals, skipping first 8s (titles/black) and last 4s (end cards)
START=8
END=$(echo "$DURATION - 4" | bc)
RANGE=$(echo "$END - $START" | bc)
STEP=$(echo "scale=2; $RANGE / ($N - 1)" | bc)

for i in $(seq 0 $(($N - 1))); do
  TS=$(echo "scale=2; $START + $i * $STEP" | bc)
  OUTFILE="${OUTDIR}/${PREFIX}_frame_$(printf '%02d' $(($i + 1))).jpg"
  $FFMPEG -ss "$TS" -i "$INPUT" -vframes 1 -q:v 2 -y "$OUTFILE" 2>/dev/null
  echo "  ✓ $(basename $OUTFILE) (${TS}s)"
done

echo "Done — ${N} frames extracted."
