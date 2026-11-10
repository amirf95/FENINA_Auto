#!/usr/bin/env python3
"""
clean_tmn.py — Remove _2, _3, _N suffixes from filenames in the TMN folder.

  000123_2.jpg  + 000123.jpg exists  →  delete 000123_2.jpg  (true duplicate)
  000123_2.jpg  + 000123.jpg missing →  rename to 000123.jpg

Run with --dry-run to preview without touching any file.
"""

import re
import sys
from pathlib import Path

IMAGES_DIR = Path(r"C:\Users\amirf\Downloads\TMN")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
SUFFIX_RE  = re.compile(r"^(.+?)_\d+$")   # matches  000123_2  →  group 1 = 000123

DRY_RUN = "--dry-run" in sys.argv

# ── Gather candidates ─────────────────────────────────────────────────────────

candidates = [
    p for p in sorted(IMAGES_DIR.iterdir())
    if p.suffix.lower() in IMAGE_EXTS and SUFFIX_RE.match(p.stem)
]

if not candidates:
    print("No _N files found — folder is already clean.")
    sys.exit(0)

print(f"{'[DRY RUN] ' if DRY_RUN else ''}Found {len(candidates)} file(s) with _N suffix:\n")

renamed  = 0
deleted  = 0
skipped  = 0

for path in candidates:
    base_stem = SUFFIX_RE.match(path.stem).group(1)
    target    = path.with_name(f"{base_stem}{path.suffix.lower()}")

    if target.exists():
        # Original already present — this file is a duplicate, delete it
        print(f"  DELETE  {path.name}  (original {target.name} already exists)")
        if not DRY_RUN:
            path.unlink()
        deleted += 1
    else:
        # Original missing — rename this file to the clean name
        print(f"  RENAME  {path.name}  →  {target.name}")
        if not DRY_RUN:
            path.rename(target)
        renamed += 1

print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Done — {renamed} renamed, {deleted} deleted, {skipped} skipped.")
if DRY_RUN:
    print("Run without --dry-run to apply changes.")
