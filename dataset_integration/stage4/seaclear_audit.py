#!/usr/bin/env python3
"""
Stage 4.1 - SeaClear Marine Debris Dataset Audit Script
OceanRescue Third-Year Mini-Project
READ-ONLY: No dataset files are modified, converted, or overwritten.

Usage: python seaclear_audit.py
Output: Prints audit report to stdout. Save with:
        python seaclear_audit.py > seaclear_audit_output.txt
"""

import json
import os
from collections import defaultdict

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = r"C:\Users\KRIN\Downloads\ocean rescue dataset\sea clear dataset\Seaclear Marine Debris Dataset"
JSON_PATH = os.path.join(BASE_DIR, "dataset.json")
REPORT_DIR = r"C:\Users\KRIN\Downloads\ocean rescue dataset\dataset_integration\stage4"

os.makedirs(REPORT_DIR, exist_ok=True)

print("=" * 80)
print("OceanRescue - Stage 4.1: SeaClear Marine Debris Dataset Audit")
print("READ-ONLY audit. No original files will be modified.")
print("=" * 80)

# ── 1. Load JSON ──────────────────────────────────────────────────────────────
print("\nLoading dataset.json ...")
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

top_keys = list(data.keys())
print(f"Top-level keys: {top_keys}")

# ── 2. Categories ─────────────────────────────────────────────────────────────
cats = data.get("categories", [])
print(f"\n[1] CATEGORIES ({len(cats)} total)")
print("-" * 60)
for c in sorted(cats, key=lambda x: x["id"]):
    sup = c.get("supercategory", "-")
    print(f"  [{c['id']:3d}]  {sup:<35s}  {c['name']}")

# ── 3. Net/rope search ────────────────────────────────────────────────────────
net_rope_keywords = ["net", "rope", "line", "cord", "string", "wire",
                     "cable", "trawl", "fishing", "entangle", "ghost"]
print("\n[2] NET/ROPE RELATED CATEGORIES")
print("-" * 60)
net_rope_cats = []
for c in cats:
    if any(kw in c["name"].lower() or kw in c.get("supercategory", "").lower()
           for kw in net_rope_keywords):
        net_rope_cats.append(c)
        print(f"  FOUND: id={c['id']:3d}  name={c['name']}  supercat={c.get('supercategory', '-')}")
if not net_rope_cats:
    print("  NONE found matching net/rope keywords")

# ── 4. Images ─────────────────────────────────────────────────────────────────
imgs = data.get("images", [])
print(f"\n[3] IMAGES")
print("-" * 60)
print(f"  Total images in JSON: {len(imgs)}")
resolutions = defaultdict(int)
for img in imgs:
    resolutions[(img.get("width", 0), img.get("height", 0))] += 1
print(f"  Resolutions:")
for res, cnt in sorted(resolutions.items()):
    print(f"    {res[0]}x{res[1]}: {cnt} images")
print(f"  Sample entries:")
for img in imgs[:3]:
    print(f"    id={img['id']}  file_name={img['file_name']}  {img.get('width')}x{img.get('height')}")

# ── 5. Image file existence ────────────────────────────────────────────────────
print(f"\n[4] IMAGE FILE RESOLUTION (disk search)")
print("-" * 60)
filename_to_path = {}
for root, dirs, files in os.walk(BASE_DIR):
    for fname in files:
        if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
            if fname not in filename_to_path:
                filename_to_path[fname] = os.path.join(root, fname)
print(f"  Unique image filenames on disk: {len(filename_to_path)}")
found = sum(1 for img in imgs if os.path.basename(img["file_name"]) in filename_to_path)
not_found = [img["file_name"] for img in imgs if os.path.basename(img["file_name"]) not in filename_to_path]
print(f"  JSON images resolved: {found} found, {len(not_found)} not found")
if not_found:
    print(f"  Not-found samples: {not_found[:5]}")
print(f"  Note: JSON file_names are bare filenames (no site/camera prefix).")
print(f"        Images reside in site/camera subfolders resolved by basename match.")

# ── 6. Annotations ────────────────────────────────────────────────────────────
anns = data.get("annotations", [])
print(f"\n[5] ANNOTATIONS")
print("-" * 60)
print(f"  Total annotations: {len(anns)}")

ann_per_cat = defaultdict(int)
has_bbox = 0
has_seg = 0
empty_seg = 0
invalid_bbox = 0
seg_types = defaultdict(int)
areas = []

for ann in anns:
    ann_per_cat[ann.get("category_id", -1)] += 1
    bbox = ann.get("bbox", [])
    seg = ann.get("segmentation", [])
    if "area" in ann:
        areas.append(ann["area"])

    if bbox and len(bbox) == 4:
        has_bbox += 1
        x, y, w, h = bbox
        if w <= 0 or h <= 0 or x < 0 or y < 0:
            invalid_bbox += 1

    if seg and isinstance(seg, list) and len(seg) > 0:
        has_seg += 1
        seg_types["polygon_list"] += 1
    elif isinstance(seg, dict):
        has_seg += 1
        seg_types["rle"] += 1
    else:
        empty_seg += 1
        seg_types["empty"] += 1

print(f"  With valid bbox:               {has_bbox}")
print(f"  Invalid bbox (w<=0/h<=0/x<0): {invalid_bbox}")
print(f"  With segmentation:             {has_seg}")
print(f"  Without segmentation:          {empty_seg}")
print(f"  Segmentation types:            {dict(seg_types)}")
print(f"  Annotations with area field:   {len(areas)}")
if areas:
    print(f"  Area stats: min={min(areas):.2f}  max={max(areas):.2f}  avg={sum(areas)/len(areas):.2f}")
iscrowd_true = sum(1 for a in anns if a.get("iscrowd", 0) == 1)
print(f"  iscrowd=1 count:               {iscrowd_true}")

# ── 7. Per-category counts ────────────────────────────────────────────────────
cat_id_to_name = {c["id"]: c["name"] for c in cats}
print(f"\n[6] ANNOTATION COUNTS PER CATEGORY (sorted by count, descending)")
print("-" * 60)
print(f"  {'[ID]':<6}  {'Category Name':<45}  {'Count':>8}")
print(f"  {'-'*6}  {'-'*45}  {'-'*8}")
for cid, cnt in sorted(ann_per_cat.items(), key=lambda x: x[1], reverse=True):
    name = cat_id_to_name.get(cid, f"UNKNOWN_ID_{cid}")
    print(f"  [{cid:3d}]   {name:<45}  {cnt:>8}")

# ── 8. Coverage ────────────────────────────────────────────────────────────────
img_ids_with_anns = set(ann["image_id"] for ann in anns)
all_img_ids = set(img["id"] for img in imgs)
unannotated = all_img_ids - img_ids_with_anns
print(f"\n[7] ANNOTATION COVERAGE")
print("-" * 60)
print(f"  Images with >=1 annotation:   {len(img_ids_with_anns)}")
print(f"  Images with no annotations:   {len(unannotated)}")
print(f"  Coverage:                      {100*len(img_ids_with_anns)/len(all_img_ids):.1f}%")

ann_per_img = defaultdict(int)
for a in anns:
    ann_per_img[a["image_id"]] += 1
counts = sorted(ann_per_img.values())
n = len(counts)
print(f"  Min ann/img: {min(counts)}   Max: {max(counts)}   Avg: {sum(counts)/n:.2f}   Median: {counts[n//2]}")

# ── 9. Net/rope annotations ────────────────────────────────────────────────────
print(f"\n[8] NET/ROPE ANNOTATION COUNTS")
print("-" * 60)
if net_rope_cats:
    nr_ids = {c["id"] for c in net_rope_cats}
    nr_anns = [a for a in anns if a.get("category_id") in nr_ids]
    print(f"  Total net/rope annotations: {len(nr_anns)}")
    nr_per_cat = defaultdict(int)
    for a in nr_anns:
        nr_per_cat[a["category_id"]] += 1
    for cid, cnt in sorted(nr_per_cat.items()):
        print(f"    [{cid:3d}] {cat_id_to_name.get(cid,'?'):<30}  {cnt}")
    print(f"  NOTE: rov_cable (id=27) and cable_metal (id=35) are ROV/equipment cables,")
    print(f"        not environmental debris. Net/rope debris only: net_plastic+rope_fiber+rope_plastic = {ann_per_cat[14]+ann_per_cat[16]+ann_per_cat[34]}")
else:
    print("  No net/rope categories found")

# ── 10. Physical image counts ──────────────────────────────────────────────────
print(f"\n[9] PHYSICAL IMAGE COUNTS PER SITE/CAMERA FOLDER")
print("-" * 60)
sites = ["Bistrina", "Jakljan", "Lokrum", "Marseille", "Slano"]
total_physical = 0
for site in sites:
    site_path = os.path.join(BASE_DIR, site)
    site_count = 0
    for cam in sorted(os.listdir(site_path)):
        cam_path = os.path.join(site_path, cam)
        if os.path.isdir(cam_path):
            img_files = [f for f in os.listdir(cam_path) if f.lower().endswith(('.jpg','.jpeg','.png'))]
            cnt = len(img_files)
            site_count += cnt
            total_physical += cnt
            print(f"  {site:<12} / {cam:<25}  {cnt:>5} images")
    print(f"  >> {site} subtotal: {site_count}")
print(f"  TOTAL physical images on disk: {total_physical}")
print(f"  TOTAL images in JSON:          {len(imgs)}")
print(f"  Match: {'YES' if total_physical == len(imgs) else 'NO - MISMATCH'}")

print("\n" + "=" * 80)
print("END OF AUDIT")
print("=" * 80)
