#!/usr/bin/env python3
"""
Stage 4.3: Unified Dataset Export & Split Generation Script
OceanRescue Third-Year Mini-Project

Generates:
1. oceanrescue_unified_full.json  - All 15,822 images and 43,683 annotations
2. oceanrescue_unified_train.json - Train split (12,958 images, 35,463 annotations)
3. oceanrescue_unified_val.json   - Val split (2,864 images, 8,220 annotations)
4. oceanrescue_debris_train.json  - Environmental debris only (train)
5. oceanrescue_debris_val.json    - Environmental debris only (val)
6. split_manifest.json            - Detailed split metadata & class balance
7. image_manifest.csv             - CSV manifest of all 15,822 images

READ-ONLY relative to source datasets:
No source dataset files are modified or overwritten.
All outputs are created strictly in dataset_integration/stage4_3/.
"""

import os
import sys
import json
import csv
from datetime import datetime
from collections import defaultdict, Counter

# Workspace paths
WORKSPACE = r"C:\Users\KRIN\Downloads\ocean rescue dataset"
SEACLEAR_ROOT = os.path.join(WORKSPACE, "sea clear dataset", "Seaclear Marine Debris Dataset")
SEACLEAR_JSON = os.path.join(SEACLEAR_ROOT, "dataset.json")

TRASHCAN_ROOT = os.path.join(WORKSPACE, "dataset", "dataset")
TC_INST_TRAIN = os.path.join(TRASHCAN_ROOT, "instance_version", "instances_train_trashcan.json")
TC_INST_VAL = os.path.join(TRASHCAN_ROOT, "instance_version", "instances_val_trashcan.json")
TC_IMG_DIR = os.path.join(TRASHCAN_ROOT, "original_data", "images")

MAPPING_JSON = os.path.join(WORKSPACE, "dataset_integration", "stage4_2", "class_mapping.json")
OUTPUT_DIR = os.path.join(WORKSPACE, "dataset_integration", "stage4_3")


def main():
    print("=" * 80)
    print("OceanRescue Stage 4.3: Unified Dataset Export & Split Generation")
    print("=" * 80)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Load class mapping table
    print("\n[Step 1] Loading class mapping configuration...")
    with open(MAPPING_JSON, 'r', encoding='utf-8') as f:
        mapping_data = json.load(f)

    sc_map = {m['source_id']: m for m in mapping_data['seaclear_mappings']}
    tc_map = {m['source_id']: m for m in mapping_data['trashcan_mappings']}

    # Target categories catalog
    target_categories = []
    # Build unique categories list
    seen_cat_ids = set()
    for tier, cat_list in mapping_data['target_taxonomy'].items():
        for cat in cat_list:
            cid = cat.get('target_id')
            if cid is not None and cid not in seen_cat_ids:
                seen_cat_ids.add(cid)
                target_categories.append({
                    "id": cid,
                    "name": cat['target_name'],
                    "supercategory": cat['supercategory'],
                    "is_environmental_debris": cat['supercategory'] in ['aldfg_priority', 'marine_debris_general'],
                    "description": cat.get('description', '')
                })
    target_categories.sort(key=lambda x: x['id'])
    print(f"  Target categories defined: {len(target_categories)}")

    # 2. Build SeaClear file resolver
    print("\n[Step 2] Building SeaClear disk path resolver...")
    sc_disk_files = {}
    for root, _, files in os.walk(SEACLEAR_ROOT):
        for fn in files:
            if fn.lower().endswith(('.jpg', '.jpeg', '.png')):
                rel_path = os.path.relpath(os.path.join(root, fn), SEACLEAR_ROOT).replace('\\', '/')
                sc_disk_files[fn] = {
                    'rel_path': rel_path,
                    'abs_path': os.path.join(root, fn).replace('\\', '/')
                }
    print(f"  Resolved {len(sc_disk_files)} SeaClear physical files.")

    # 3. Load SeaClear annotations
    print("\n[Step 3] Ingesting SeaClear dataset...")
    with open(SEACLEAR_JSON, 'r', encoding='utf-8') as f:
        sc_raw = json.load(f)

    # SeaClear site partition for split (Zero Leakage):
    # Train sites: Bistrina + Marseille
    # Val sites  : Lokrum + Jakljan + Slano
    train_sites = {"Bistrina", "Marseille"}
    val_sites = {"Lokrum", "Jakljan", "Slano"}

    unified_images = []
    unified_annotations = []

    sc_img_id_map = {}
    for img in sc_raw['images']:
        raw_id = img['id']
        fn = img['file_name']
        resolved = sc_disk_files[fn]
        parts = resolved['rel_path'].split('/')
        site = parts[0]
        camera = parts[1] if len(parts) > 2 else "single"
        split = "train" if site in train_sites else "val"

        unified_img_id = f"seaclear_{raw_id}"
        sc_img_id_map[raw_id] = unified_img_id

        unified_images.append({
            "id": unified_img_id,
            "source_dataset": "seaclear",
            "source_image_id": raw_id,
            "file_name": fn,
            "relative_path": f"sea clear dataset/Seaclear Marine Debris Dataset/{resolved['rel_path']}",
            "absolute_path": resolved['abs_path'],
            "width": img['width'],
            "height": img['height'],
            "site": site,
            "camera": camera,
            "sequence_id": f"{site.lower()}_{camera.lower().replace(' ', '_')}",
            "split_group": f"seaclear_site_{site.lower()}",
            "planned_split": split
        })

    for ann in sc_raw['annotations']:
        raw_ann_id = ann['id']
        raw_img_id = ann['image_id']
        raw_cat_id = ann['category_id']
        m = sc_map[raw_cat_id]

        unified_annotations.append({
            "id": f"seaclear_ann_{raw_ann_id}",
            "image_id": sc_img_id_map[raw_img_id],
            "source_dataset": "seaclear",
            "source_ann_id": raw_ann_id,
            "source_category_id": raw_cat_id,
            "source_category_name": m['source_name'],
            "target_category_id": m['target_id'],
            "target_category_name": m['target_name'],
            "target_supercategory": m['target_supercategory'],
            "mapping_status": m['mapping_status'],
            "is_environmental_debris": m['is_environmental_debris'],
            "bbox": ann['bbox'],
            "segmentation": ann['segmentation'],
            "area": ann.get('area', ann['bbox'][2] * ann['bbox'][3]),
            "iscrowd": ann.get('iscrowd', 0)
        })

    print(f"  Ingested SeaClear: {len(sc_raw['images'])} images, {len(sc_raw['annotations'])} annotations.")

    # 4. Load TrashCan annotations
    print("\n[Step 4] Ingesting TrashCan dataset & computing zero-leakage split...")
    with open(TC_INST_TRAIN, 'r', encoding='utf-8') as f:
        tc_tr = json.load(f)
    with open(TC_INST_VAL, 'r', encoding='utf-8') as f:
        tc_val = json.load(f)

    tc_all_images = tc_tr['images'] + tc_val['images']
    tc_all_anns = tc_tr['annotations'] + tc_val['annotations']

    # Build sequence mapping for TrashCan
    tc_seq_images = defaultdict(list)
    tc_seq_classes = defaultdict(Counter)
    tc_raw_img_to_seq = {}

    for img in tc_all_images:
        fn = img['file_name']
        seq = '_'.join(os.path.splitext(fn)[0].split('_')[:-1]) if '_' in fn else "single_frame"
        tc_seq_images[seq].append(img['id'])
        tc_raw_img_to_seq[img['id']] = seq

    for ann in tc_all_anns:
        seq = tc_raw_img_to_seq[ann['image_id']]
        tc_seq_classes[seq][ann['category_id']] += 1

    all_tc_seqs = sorted(list(tc_seq_images.keys()))
    # Deterministic stratified split:
    net_seqs = sorted([s for s in all_tc_seqs if tc_seq_classes[s][22] > 0])
    rope_only_seqs = sorted([s for s in all_tc_seqs if tc_seq_classes[s][21] > 0 and tc_seq_classes[s][22] == 0])
    other_seqs = sorted([s for s in all_tc_seqs if tc_seq_classes[s][22] == 0 and tc_seq_classes[s][21] == 0])

    val_net_seqs = [net_seqs[4], net_seqs[9]]  # 2 of 11 to val
    train_net_seqs = [s for s in net_seqs if s not in val_net_seqs]

    val_rope_seqs = [rope_only_seqs[2], rope_only_seqs[6]]  # 2 of 7 to val
    train_rope_seqs = [s for s in rope_only_seqs if s not in val_rope_seqs]

    val_other_seqs = [other_seqs[i] for i in range(len(other_seqs)) if i % 5 == 0]  # ~20% of other
    train_other_seqs = [s for s in other_seqs if s not in val_other_seqs]

    tc_train_seq_set = set(train_net_seqs + train_rope_seqs + train_other_seqs)
    tc_val_seq_set = set(val_net_seqs + val_rope_seqs + val_other_seqs)

    # Verify zero leakage
    tc_overlap = tc_train_seq_set.intersection(tc_val_seq_set)
    assert len(tc_overlap) == 0, "FATAL: Sequence overlap detected in TrashCan split!"
    print(f"  TrashCan Zero-Leakage Split: {len(tc_train_seq_set)} train seqs, {len(tc_val_seq_set)} val seqs (Overlap: 0)")

    tc_img_id_map = {}
    for img in tc_all_images:
        raw_id = img['id']
        fn = img['file_name']
        seq = tc_raw_img_to_seq[raw_id]
        split = "train" if seq in tc_train_seq_set else "val"

        unified_img_id = f"trashcan_{raw_id}"
        tc_img_id_map[raw_id] = unified_img_id

        abs_path = os.path.join(TC_IMG_DIR, fn).replace('\\', '/')
        rel_path = f"dataset/dataset/original_data/images/{fn}"

        unified_images.append({
            "id": unified_img_id,
            "source_dataset": "trashcan_instance",
            "source_image_id": raw_id,
            "file_name": fn,
            "relative_path": rel_path,
            "absolute_path": abs_path,
            "width": img['width'],
            "height": img['height'],
            "site": None,
            "camera": None,
            "sequence_id": seq,
            "split_group": f"trashcan_seq_{seq}",
            "planned_split": split
        })

    for ann in tc_all_anns:
        raw_ann_id = ann['id']
        raw_img_id = ann['image_id']
        raw_cat_id = ann['category_id']
        m = tc_map[raw_cat_id]

        unified_annotations.append({
            "id": f"trashcan_ann_{raw_ann_id}",
            "image_id": tc_img_id_map[raw_img_id],
            "source_dataset": "trashcan_instance",
            "source_ann_id": raw_ann_id,
            "source_category_id": raw_cat_id,
            "source_category_name": m['source_name'],
            "target_category_id": m['target_id'],
            "target_category_name": m['target_name'],
            "target_supercategory": m['target_supercategory'],
            "mapping_status": m['mapping_status'],
            "is_environmental_debris": m['is_environmental_debris'],
            "bbox": ann['bbox'],
            "segmentation": ann['segmentation'],
            "area": ann.get('area', ann['bbox'][2] * ann['bbox'][3]),
            "iscrowd": ann.get('iscrowd', 0)
        })

    print(f"  Ingested TrashCan: {len(tc_all_images)} images, {len(tc_all_anns)} annotations.")
    print(f"\n[Combined Totals] Total Images: {len(unified_images)}, Total Annotations: {len(unified_annotations)}")

    # 5. Build Split Partitions
    print("\n[Step 5] Partitioning splits and building COCO datasets...")
    train_images = [img for img in unified_images if img['planned_split'] == 'train']
    val_images = [img for img in unified_images if img['planned_split'] == 'val']

    train_img_ids = set(img['id'] for img in train_images)
    val_img_ids = set(img['id'] for img in val_images)

    train_annotations = [ann for ann in unified_annotations if ann['image_id'] in train_img_ids]
    val_annotations = [ann for ann in unified_annotations if ann['image_id'] in val_img_ids]

    debris_train_annotations = [ann for ann in train_annotations if ann['is_environmental_debris']]
    debris_val_annotations = [ann for ann in val_annotations if ann['is_environmental_debris']]

    debris_categories = [c for c in target_categories if c['is_environmental_debris']]

    # Common info block
    info_block = {
        "project": "OceanRescue",
        "version": "1.0.0",
        "description": "Unified Underwater Marine Debris Benchmark Dataset (SeaClear + TrashCan 1.0)",
        "date_created": datetime.now().isoformat(),
        "source_datasets": [
            "SeaClear Marine Debris Dataset (TU Delft / University of Dubrovnik, 2022)",
            "TrashCan 1.0 Instance-Version (IRVLab, University of Minnesota, 2020)"
        ],
        "aldfg_priority_classes": ["fishing_net", "rope_line"],
        "unsupported_classes": ["trap_cage"],
        "uncertain_classes": ["uncertain_cable_metal"],
        "excluded_classes": ["rov_equipment", "marine_biology"],
        "licensing": {
            "seaclear": "Academic research use only",
            "trashcan": "Creative Commons Attribution 4.0 International (CC BY 4.0)"
        }
    }

    # 6. Export Full Unified JSON
    full_coco = {
        "info": info_block,
        "categories": target_categories,
        "images": unified_images,
        "annotations": unified_annotations
    }
    full_path = os.path.join(OUTPUT_DIR, "oceanrescue_unified_full.json")
    print(f"  Exporting full dataset to {full_path}...")
    with open(full_path, 'w', encoding='utf-8') as f:
        json.dump(full_coco, f, indent=2)

    # 7. Export Train JSON
    train_coco = {
        "info": info_block,
        "categories": target_categories,
        "images": train_images,
        "annotations": train_annotations
    }
    train_path = os.path.join(OUTPUT_DIR, "oceanrescue_unified_train.json")
    print(f"  Exporting unified train split to {train_path}...")
    with open(train_path, 'w', encoding='utf-8') as f:
        json.dump(train_coco, f, indent=2)

    # 8. Export Val JSON
    val_coco = {
        "info": info_block,
        "categories": target_categories,
        "images": val_images,
        "annotations": val_annotations
    }
    val_path = os.path.join(OUTPUT_DIR, "oceanrescue_unified_val.json")
    print(f"  Exporting unified val split to {val_path}...")
    with open(val_path, 'w', encoding='utf-8') as f:
        json.dump(val_coco, f, indent=2)

    # 9. Export Debris-Only Datasets (for direct detector training)
    debris_train_coco = {
        "info": info_block,
        "categories": debris_categories,
        "images": train_images,
        "annotations": debris_train_annotations
    }
    debris_train_path = os.path.join(OUTPUT_DIR, "oceanrescue_debris_train.json")
    print(f"  Exporting debris-only train dataset to {debris_train_path}...")
    with open(debris_train_path, 'w', encoding='utf-8') as f:
        json.dump(debris_train_coco, f, indent=2)

    debris_val_coco = {
        "info": info_block,
        "categories": debris_categories,
        "images": val_images,
        "annotations": debris_val_annotations
    }
    debris_val_path = os.path.join(OUTPUT_DIR, "oceanrescue_debris_val.json")
    print(f"  Exporting debris-only val dataset to {debris_val_path}...")
    with open(debris_val_path, 'w', encoding='utf-8') as f:
        json.dump(debris_val_coco, f, indent=2)

    # 10. Export Image Manifest CSV
    manifest_csv_path = os.path.join(OUTPUT_DIR, "image_manifest.csv")
    print(f"  Exporting image manifest CSV to {manifest_csv_path}...")
    fieldnames = [
        "id", "source_dataset", "source_image_id", "file_name",
        "relative_path", "absolute_path", "width", "height",
        "site", "camera", "sequence_id", "split_group", "planned_split"
    ]
    with open(manifest_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for img in unified_images:
            writer.writerow(img)

    # 11. Export Split Manifest JSON
    split_manifest = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_images": len(unified_images),
            "train_images": len(train_images),
            "val_images": len(val_images),
            "total_annotations": len(unified_annotations),
            "train_annotations": len(train_annotations),
            "val_annotations": len(val_annotations),
            "debris_train_annotations": len(debris_train_annotations),
            "debris_val_annotations": len(debris_val_annotations)
        },
        "seaclear_split": {
            "strategy": "Group-by-Site (geographic isolation)",
            "train_sites": sorted(list(train_sites)),
            "val_sites": sorted(list(val_sites)),
            "train_images": sum(1 for img in train_images if img['source_dataset'] == 'seaclear'),
            "val_images": sum(1 for img in val_images if img['source_dataset'] == 'seaclear'),
            "site_leakage": 0
        },
        "trashcan_split": {
            "strategy": "Group-by-Video Sequence (stratified rare class allocation)",
            "total_sequences": len(all_tc_seqs),
            "train_sequences_count": len(tc_train_seq_set),
            "val_sequences_count": len(tc_val_seq_set),
            "train_images": sum(1 for img in train_images if img['source_dataset'] == 'trashcan_instance'),
            "val_images": sum(1 for img in val_images if img['source_dataset'] == 'trashcan_instance'),
            "sequence_leakage": len(tc_overlap),
            "train_sequences": sorted(list(tc_train_seq_set)),
            "val_sequences": sorted(list(tc_val_seq_set))
        },
        "class_balance": {
            "all_classes_train": dict(Counter(ann['target_category_name'] for ann in train_annotations)),
            "all_classes_val": dict(Counter(ann['target_category_name'] for ann in val_annotations)),
            "aldfg_priority": {
                "fishing_net": {
                    "train": sum(1 for a in train_annotations if a['target_category_name'] == 'fishing_net'),
                    "val": sum(1 for a in val_annotations if a['target_category_name'] == 'fishing_net')
                },
                "rope_line": {
                    "train": sum(1 for a in train_annotations if a['target_category_name'] == 'rope_line'),
                    "val": sum(1 for a in val_annotations if a['target_category_name'] == 'rope_line')
                }
            }
        }
    }
    split_manifest_path = os.path.join(OUTPUT_DIR, "split_manifest.json")
    print(f"  Exporting split manifest metadata to {split_manifest_path}...")
    with open(split_manifest_path, 'w', encoding='utf-8') as f:
        json.dump(split_manifest, f, indent=2)

    print("\n" + "=" * 80)
    print("STAGE 4.3 EXPORT COMPLETE")
    print("=" * 80)
    print(f"  Total physical images registered : {len(unified_images)}")
    print(f"  Total annotations converted       : {len(unified_annotations)}")
    print(f"  Train set: {len(train_images)} images, {len(train_annotations)} annotations")
    print(f"  Val set  : {len(val_images)} images, {len(val_annotations)} annotations")
    print(f"  ALDFG Nets : {split_manifest['class_balance']['aldfg_priority']['fishing_net']}")
    print(f"  ALDFG Ropes: {split_manifest['class_balance']['aldfg_priority']['rope_line']}")
    print("=" * 80)


if __name__ == "__main__":
    main()
