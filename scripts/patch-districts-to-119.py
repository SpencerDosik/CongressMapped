#!/usr/bin/env python3
"""
Transform the existing 118th Congress districts.json to use 119th Congress property names.

For 430 of 435 districts the geometry is IDENTICAL between the 118th and 119th Congress.
Five states drew new maps for 2024: AL, GA, LA, NY, NC.

This script:
  1. Renames CD118FP → CD119FP in all properties
  2. Updates CDSESSN to "119"
  3. Adds _boundaryChanged: true for the 5 remapped states so the UI can show a caveat

After running this, run fetch-districts-119.py to download and overlay the correct
Census TIGER geometries for AL, GA, LA, NY, and NC.
"""
import json, sys
from pathlib import Path

BOUNDARY_CHANGED = {"01", "13", "22", "36", "37"}  # FIPS for AL, GA, LA, NY, NC

src = Path(__file__).parent.parent / "public" / "districts.json"
out = Path(__file__).parent.parent / "public" / "districts.json"

print(f"Reading {src}...")
with open(src) as f:
    data = json.load(f)

changed = 0
remapped = 0
for feature in data["features"]:
    props = feature["properties"]
    # Rename property
    if "CD118FP" in props:
        props["CD119FP"] = props.pop("CD118FP")
        changed += 1
    # Update session number
    props["CDSESSN"] = "119"
    # Flag remapped states
    if props.get("STATEFP") in BOUNDARY_CHANGED:
        props["_boundaryChanged"] = True
        props["_boundaryNote"] = "Court-ordered remap for 119th Congress. Geometry is approximate (118th lines shown)."
        remapped += 1

print(f"  Updated {changed} features (CD118FP → CD119FP)")
print(f"  Flagged {remapped} features in AL/GA/LA/NY/NC as boundary-changed")

with open(out, "w") as f:
    json.dump(data, f, separators=(",", ":"))

print(f"Written to {out}")
print()
print("NOTE: Geometry for AL, GA, LA, NY, NC districts is still 118th Congress lines.")
print("Run scripts/fetch-districts-119.py when network access allows to fix those 5 states.")
