#!/usr/bin/env python3
"""
Download 119th Congress Congressional District boundaries from Census TIGER/Line (2024)
and replace the geometry for the 5 states that drew new maps for 2024:
  Alabama (AL), Georgia (GA), Louisiana (LA), New York (NY), North Carolina (NC).

All other state boundaries are pulled from the existing public/districts.json
(which already has the same geometry as 119th Congress for those 430 districts).

Usage:
  python3 scripts/fetch-districts-119.py

Requirements:
  pip install pyshp requests

Output:
  public/districts.json   (updated in-place, 119th Congress boundaries for all states)
"""
import json, sys, zipfile, io, struct
from pathlib import Path

try:
    import shapefile as sf
except ImportError:
    sys.exit("Missing pyshp. Run: pip install pyshp")

try:
    import requests
except ImportError:
    sys.exit("Missing requests. Run: pip install requests")

TIGER_URL = "https://www2.census.gov/geo/tiger/TIGER2024/CD/tl_2024_us_cd119.zip"
BOUNDARY_CHANGED = {"01", "13", "22", "36", "37"}  # AL, GA, LA, NY, NC

ROOT = Path(__file__).parent.parent
OUT_FILE = ROOT / "public" / "districts.json"


def shapefile_to_geojson_features(zipped_bytes: bytes) -> list:
    """Read a zipped TIGER shapefile and return GeoJSON features."""
    z = zipfile.ZipFile(io.BytesIO(zipped_bytes))
    names = z.namelist()
    shp_name = next(n for n in names if n.endswith(".shp"))
    dbf_name = next(n for n in names if n.endswith(".dbf"))

    shp_data = io.BytesIO(z.read(shp_name))
    dbf_data = io.BytesIO(z.read(dbf_name))
    reader = sf.Reader(shp=shp_data, dbf=dbf_data)

    features = []
    for rec, shape in zip(reader.records(), reader.shapes()):
        # Convert shapefile record to dict
        props = {field[0]: rec[i] for i, field in enumerate(reader.fields[1:])}
        # Build GeoJSON geometry
        geom = shape.__geo_interface__
        feature = {"type": "Feature", "properties": props, "geometry": geom}
        features.append(feature)
    return features


def main():
    print(f"Downloading {TIGER_URL} ...")
    resp = requests.get(TIGER_URL, timeout=120)
    resp.raise_for_status()
    print(f"  Downloaded {len(resp.content) / 1024 / 1024:.1f} MB")

    print("Parsing shapefile...")
    tiger_features = shapefile_to_geojson_features(resp.content)
    print(f"  Parsed {len(tiger_features)} features from TIGER")

    # Build lookup by GEOID (STATEFP + CD119FP)
    tiger_by_geoid: dict[str, dict] = {}
    for feat in tiger_features:
        p = feat["properties"]
        geoid = p.get("GEOID") or (p.get("STATEFP", "") + p.get("CD119FP", ""))
        tiger_by_geoid[geoid] = feat

    print(f"Reading existing {OUT_FILE}...")
    with open(OUT_FILE) as f:
        data = json.load(f)

    # Update geometry for the 5 remapped states
    updated = 0
    for feature in data["features"]:
        props = feature["properties"]
        if props.get("STATEFP") not in BOUNDARY_CHANGED:
            continue
        geoid = props.get("GEOID") or (props.get("STATEFP", "") + props.get("CD119FP", ""))
        if geoid in tiger_by_geoid:
            feature["geometry"] = tiger_by_geoid[geoid]["geometry"]
            # Update/merge Tiger properties
            tiger_props = tiger_by_geoid[geoid]["properties"]
            props.update({k: v for k, v in tiger_props.items() if k not in ("GEOID",)})
            props.pop("_boundaryChanged", None)
            props.pop("_boundaryNote", None)
            updated += 1

    print(f"  Updated geometry for {updated} districts in AL/GA/LA/NY/NC")

    with open(OUT_FILE, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"Written to {OUT_FILE}")


if __name__ == "__main__":
    main()
