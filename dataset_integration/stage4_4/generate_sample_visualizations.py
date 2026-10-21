#!/usr/bin/env python3
"""
Stage 4.4 Sample Visualization Generator
OceanRescue Third-Year Mini-Project

Renders real underwater images from SeaClear and TrashCan with:
1. Ground-truth bounding boxes
2. Semi-transparent polygon segmentation masks
3. Clear class labels and source lineage
4. Multi-panel summary montage and individual sample images

Outputs:
- dataset_integration/stage4_4/samples/sample_1_seaclear_net.png
- dataset_integration/stage4_4/samples/sample_2_trashcan_net.png
- dataset_integration/stage4_4/samples/sample_3_seaclear_rope.png
- dataset_integration/stage4_4/samples/sample_4_trashcan_rope.png
- dataset_integration/stage4_4/samples/sample_5_multi_debris.png
- dataset_integration/stage4_4/samples/sample_6_background_empty.png
- dataset_integration/stage4_4/sample_visualization_montage.png
"""

import os
import json
from collections import defaultdict
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import Polygon as MplPolygon
from PIL import Image
import numpy as np

WORKSPACE = r"C:\Users\KRIN\Downloads\ocean rescue dataset"
DEBRIS_TRAIN = os.path.join(WORKSPACE, "dataset_integration", "stage4_3", "oceanrescue_debris_train.json")
OUTPUT_DIR = os.path.join(WORKSPACE, "dataset_integration", "stage4_4")
SAMPLES_DIR = os.path.join(OUTPUT_DIR, "samples")

CLASS_COLORS = {
    "fishing_net": ("#FF1744", "#FF5252"),       # Red
    "rope_line": ("#00E5FF", "#18FFFF"),         # Cyan
    "debris_bottle": ("#00E676", "#69F0AE"),     # Green
    "debris_bag": ("#FFEA00", "#FFFF00"),        # Yellow
    "debris_can": ("#E040FB", "#EA80FC"),        # Magenta
    "debris_container": ("#FF9100", "#FFAB40"),  # Orange
    "debris_cup": ("#7C4DFF", "#B388FF"),        # Deep Purple
    "debris_pipe": ("#76FF03", "#B2FF59"),       # Lime
    "debris_snack_wrapper": ("#FF4081", "#FF80AB"), # Pink
    "debris_clothing": ("#40C4FF", "#80D8FF"),   # Light Blue
    "debris_tarp": ("#FFD740", "#FFE57F"),       # Amber
    "debris_wreckage": ("#B0BEC5", "#CFD8DC"),   # Blue Grey
    "debris_branch_wood": ("#8D6E63", "#A1887F"),# Brown
    "debris_other": ("#9E9E9E", "#E0E0E0")       # Grey
}


def draw_annotation_on_ax(ax, ann):
    cname = ann['target_category_name']
    edge_color, fill_color = CLASS_COLORS.get(cname, ("#00E5FF", "#18FFFF"))

    # Bounding Box
    bbox = ann.get('bbox', [])
    if len(bbox) == 4:
        x, y, w, h = bbox
        rect = patches.Rectangle((x, y), w, h, linewidth=2.5, edgecolor=edge_color, facecolor='none', linestyle='-')
        ax.add_patch(rect)

        # Label badge
        source_info = f"{cname} [{ann['source_dataset']}]"
        ax.text(x, max(0, y - 8), source_info, fontsize=10, fontweight='bold',
                color='white', bbox=dict(boxstyle="square,pad=0.25", facecolor=edge_color, edgecolor='none', alpha=0.9))

    # Polygon Segmentation Mask
    seg = ann.get('segmentation', [])
    if isinstance(seg, list):
        for poly in seg:
            if len(poly) >= 6:
                pts = np.array(poly).reshape((-1, 2))
                mpl_poly = MplPolygon(pts, closed=True, facecolor=fill_color, edgecolor=edge_color,
                                      linewidth=1.5, alpha=0.35)
                ax.add_patch(mpl_poly)


def render_single_image(img_info, anns, output_path, title):
    img_path = img_info['absolute_path']
    if not os.path.exists(img_path):
        print(f"Error: {img_path} does not exist.")
        return

    im = Image.open(img_path)
    w, h = im.size

    fig, ax = plt.subplots(figsize=(12, 7.5), dpi=150)
    ax.imshow(im)

    if anns:
        for ann in anns:
            draw_annotation_on_ax(ax, ann)
    else:
        # Background empty image
        ax.text(w * 0.05, h * 0.1, "TRUE BACKGROUND IMAGE\n(Zero Retained Debris Annotations)",
                fontsize=14, fontweight='bold', color='yellow',
                bbox=dict(boxstyle="round,pad=0.5", facecolor='black', alpha=0.75))

    ax.set_title(f"{title} | {img_info['file_name']} ({w}x{h}) | Dataset: {img_info['source_dataset']}",
                 fontsize=12, fontweight='bold', pad=10)
    ax.axis('off')
    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight')
    plt.close()
    print(f"  [SAVED] {os.path.basename(output_path)}")


def generate_montage(samples_data, output_path):
    fig, axes = plt.subplots(2, 3, figsize=(18, 11), dpi=150)
    axes = axes.flatten()

    for idx, (img_info, anns, title) in enumerate(samples_data):
        ax = axes[idx]
        img_path = img_info['absolute_path']
        im = Image.open(img_path)
        w, h = im.size
        ax.imshow(im)

        if anns:
            for ann in anns:
                draw_annotation_on_ax(ax, ann)
        else:
            ax.text(w * 0.05, h * 0.15, "BACKGROUND (0 Debris)",
                    fontsize=11, fontweight='bold', color='yellow',
                    bbox=dict(boxstyle="round,pad=0.4", facecolor='black', alpha=0.8))

        ax.set_title(f"[{idx+1}] {title}\n{img_info['file_name']} ({img_info['source_dataset']})",
                     fontsize=9, fontweight='bold')
        ax.axis('off')

    plt.suptitle("OceanRescue Stage 4.4: Ground-Truth Dataset Visualizations (ALDFG Priority & Debris)",
                 fontsize=14, fontweight='bold', y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig(output_path, bbox_inches='tight')
    plt.close()
    print(f"  [SAVED MONTAGE] {os.path.basename(output_path)}")


def main():
    print("=" * 80)
    print("OceanRescue Stage 4.4: Sample Visualization Generator")
    print("=" * 80)

    os.makedirs(SAMPLES_DIR, exist_ok=True)

    print("\n[Step 1] Loading debris train dataset...")
    with open(DEBRIS_TRAIN, 'r', encoding='utf-8') as f:
        data = json.load(f)

    img_map = {img['id']: img for img in data['images']}
    anns_by_img = defaultdict(list)
    for ann in data['annotations']:
        anns_by_img[ann['image_id']].append(ann)

    # 1. SeaClear Net
    sc_net_ann = [a for a in data['annotations'] if a['target_category_name'] == 'fishing_net' and a['source_dataset'] == 'seaclear'][0]
    sc_net_img = img_map[sc_net_ann['image_id']]

    # 2. TrashCan Net
    tc_net_ann = [a for a in data['annotations'] if a['target_category_name'] == 'fishing_net' and a['source_dataset'] == 'trashcan_instance'][0]
    tc_net_img = img_map[tc_net_ann['image_id']]

    # 3. SeaClear Rope
    sc_rope_ann = [a for a in data['annotations'] if a['target_category_name'] == 'rope_line' and a['source_dataset'] == 'seaclear'][0]
    sc_rope_img = img_map[sc_rope_ann['image_id']]

    # 4. TrashCan Rope
    tc_rope_ann = [a for a in data['annotations'] if a['target_category_name'] == 'rope_line' and a['source_dataset'] == 'trashcan_instance'][0]
    tc_rope_img = img_map[tc_rope_ann['image_id']]

    # 5. Multi-debris image (has >= 3 annotations with distinct classes)
    multi_img_id = None
    for iid, anns in anns_by_img.items():
        cnames = set(a['target_category_name'] for a in anns)
        if len(cnames) >= 2 and len(anns) >= 3:
            multi_img_id = iid
            break
    multi_img = img_map[multi_img_id]

    # 6. Background empty image (0 debris annotations)
    empty_img = [img for img in data['images'] if len(anns_by_img[img['id']]) == 0][0]

    samples = [
        (sc_net_img, anns_by_img[sc_net_img['id']], "SeaClear Priority ALDFG: Fishing Net"),
        (tc_net_img, anns_by_img[tc_net_img['id']], "TrashCan Priority ALDFG: Fishing Net"),
        (sc_rope_img, anns_by_img[sc_rope_img['id']], "SeaClear Priority ALDFG: Rope / Line"),
        (tc_rope_img, anns_by_img[tc_rope_img['id']], "TrashCan Priority ALDFG: Rope / Line"),
        (multi_img, anns_by_img[multi_img['id']], "Multi-Class Marine Debris Scene"),
        (empty_img, [], "Background Negative Sample (0 Debris)")
    ]

    print("\n[Step 2] Rendering individual sample images...")
    filenames = [
        "sample_1_seaclear_net.png",
        "sample_2_trashcan_net.png",
        "sample_3_seaclear_rope.png",
        "sample_4_trashcan_rope.png",
        "sample_5_multi_debris.png",
        "sample_6_background_empty.png"
    ]

    for (img_info, anns, title), fn in zip(samples, filenames):
        out_p = os.path.join(SAMPLES_DIR, fn)
        render_single_image(img_info, anns, out_p, title)

    print("\n[Step 3] Rendering consolidated 6-panel summary montage...")
    montage_path = os.path.join(OUTPUT_DIR, "sample_visualization_montage.png")
    generate_montage(samples, montage_path)

    print("\nVisualizations successfully generated under dataset_integration/stage4_4/.")


if __name__ == "__main__":
    main()
