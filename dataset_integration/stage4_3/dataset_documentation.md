# OceanRescue Stage 4.3: Unified Dataset Documentation

## 1. Overview & Dataset Profile

The **OceanRescue Unified Marine Debris Benchmark** integrates two major underwater computer vision datasets into a standardized, leak-free object detection and instance segmentation framework:

1. **SeaClear Marine Debris Dataset**: 8,610 high-resolution (1920×1080) field images collected by autonomous ROVs across 5 coastal sites in the Adriatic Sea (Croatia) and Mediterranean Sea (France).
2. **TrashCan 1.0 (Instance-Version)**: 7,212 underwater images extracted from 312 ROV video sequences in diverse marine habitats.

### Key Statistics
- **Total Physical Images**: 15,822
- **Total Annotations**: 43,683 (100% bounding box + polygon segmentation coverage)
- **Train Split**: 12,958 images (81.9%), 35,126 annotations
- **Val Split**: 2,864 images (18.1%), 8,557 annotations
- **Environmental Debris Net Annotations**: 22,659 (Train: 17,428; Val: 5,231)
- **ROV Hardware & Biology**: 20,875 annotations (explicitly isolated and excluded from debris detectors)
- **Uncertain Maritime Infrastructure**: 149 annotations (`uncertain_cable_metal` isolated)

---

## 2. Directory Layout & Generated Files

All Stage 4.3 files are located in `dataset_integration/stage4_3/`:

```
dataset_integration/stage4_3/
├── oceanrescue_unified_full.json    # Complete benchmark (15,822 images, 43,683 anns, 17 classes)
├── oceanrescue_unified_train.json   # Unified train split (12,958 images, 35,126 anns)
├── oceanrescue_unified_val.json     # Unified validation split (2,864 images, 8,557 anns)
├── oceanrescue_debris_train.json    # Clean debris-only train set (ROV & biology excluded)
├── oceanrescue_debris_val.json      # Clean debris-only validation set (ROV & biology excluded)
├── split_manifest.json              # Machine-readable split definitions, group lists, & balance
├── image_manifest.csv               # Flat CSV listing every image, path, resolution, and split
├── export_unified_dataset.py        # Generation script (reproducible from source data)
├── validate_stage4_3_outputs.py     # Independent validation & integrity audit script
├── dataset_documentation.md         # This technical documentation file
└── stage4_3_validation_report.txt   # Formal audit and sign-off report
```

---

## 3. Class Index & Taxonomy Catalog

### 3.1. Full Unified Taxonomy (17 Categories)

| Target ID | Class Name | Supercategory | Debris? | Total Anns | Train Anns | Val Anns |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| **1** | `fishing_net` | `aldfg_priority` | **YES** | **1,087** | **1,040** | **47** |
| **2** | `rope_line` | `aldfg_priority` | **YES** | **2,164** | **2,069** | **95** |
| **3** | `debris_bottle` | `marine_debris_general` | **YES** | 3,718 | 3,604 | 114 |
| **4** | `debris_bag` | `marine_debris_general` | **YES** | 1,790 | 1,595 | 195 |
| **5** | `debris_can` | `marine_debris_general` | **YES** | 1,589 | 1,489 | 100 |
| **6** | `debris_container` | `marine_debris_general` | **YES** | 654 | 557 | 97 |
| **7** | `debris_cup` | `marine_debris_general` | **YES** | 511 | 486 | 25 |
| **8** | `debris_pipe` | `marine_debris_general` | **YES** | 311 | 272 | 39 |
| **9** | `debris_snack_wrapper` | `marine_debris_general` | **YES** | 264 | 247 | 17 |
| **10** | `debris_clothing` | `marine_debris_general` | **YES** | 380 | 362 | 18 |
| **11** | `debris_tarp` | `marine_debris_general` | **YES** | 152 | 126 | 26 |
| **12** | `debris_wreckage` | `marine_debris_general` | **YES** | 430 | 394 | 36 |
| **13** | `debris_branch_wood` | `marine_debris_general` | **YES** | 766 | 689 | 77 |
| **14** | `debris_other` | `marine_debris_general` | **YES** | 8,843 | 4,500 | 4,343 |
| **15** | `uncertain_cable_metal` | `uncertain_infrastructure` | **NO** | 149 | 149 | 0 |
| **101** | `rov_equipment` | `rov_equipment_excluded` | **NO** | 4,280 | 3,594 | 686 |
| **201** | `marine_biology` | `marine_bio_excluded` | **NO** | 16,595 | 13,953 | 2,642 |

### 3.2. Debris-Only Training Subset (14 Classes)
For standard marine debris detection tasks, use `oceanrescue_debris_train.json` and `oceanrescue_debris_val.json`.
- Excludes `rov_equipment` (ID 101) and `marine_biology` (ID 201).
- Excludes `uncertain_cable_metal` (ID 15) from debris targets to prevent label contamination.
- Total training instances: **17,428**; Validation instances: **5,231**.

---

## 4. Zero-Leakage Split Methodology

To prevent artificial metric inflation caused by temporal and spatial correlation between adjacent video frames:

1. **TrashCan Video Sequence Split**:
   - Images belong to 312 distinct ROV video tracks (`vid_000001` to `vid_000554`).
   - Grouping: Entire video clips are assigned atomically to either train (249 sequences) or validation (63 sequences).
   - Rare class stratification: Video sequences containing `trash_net` (11 sequences) and `trash_rope` (7 sequences) were allocated deterministically (Net: 9 train / 2 val; Rope: 5 train / 2 val).
   - **Sequence Leakage**: **0 overlapping sequences (0.0% leakage)**.

2. **SeaClear Deployment Site Split**:
   - Grouping: 5 geographic survey sites partitioned into independent domains:
     - **Train Sites**: `Bistrina` (3,652 images) and `Marseille` (3,441 images) = 7,093 images.
     - **Validation Sites**: `Lokrum` (972 images), `Jakljan` (306 images), and `Slano` (239 images) = 1,517 images.
   - **Site Leakage**: **0 overlapping images across sites (0.0% leakage)**.

---

## 5. Usage & Data Loading Examples

### 5.1. Loading with Python `json` & `pycocotools`

```python
from pycocotools.coco import COCO
import os

# Initialize COCO API for debris training set
ann_file = "dataset_integration/stage4_3/oceanrescue_debris_train.json"
coco = COCO(ann_file)

# Get all images containing fishing nets (cat_id = 1)
net_cat_id = 1
net_img_ids = coco.getImgIds(catIds=[net_cat_id])
print(f"Found {len(net_img_ids)} training images containing fishing nets.")

# Inspect first image
img_info = coco.loadImgs(net_img_ids[0])[0]
print(f"Image File: {img_info['file_name']}")
print(f"Absolute Path: {img_info['absolute_path']}")

# Load annotations
ann_ids = coco.getAnnIds(imgIds=[img_info['id']], catIds=[net_cat_id])
anns = coco.loadAnns(ann_ids)
print(f"Bbox: {anns[0]['bbox']}, Original Class: {anns[0]['source_category_name']}")
```

### 5.2. Loading with PyTorch / Torchvision

```python
import torchvision.datasets as dset
import torchvision.transforms as T

# Standard Torchvision CocoDetection dataset
train_dataset = dset.CocoDetection(
    root=".", # workspace root
    annFile="dataset_integration/stage4_3/oceanrescue_debris_train.json",
    transform=T.Compose([T.ToTensor()])
)
print(f"Dataset loaded: {len(train_dataset)} samples.")
```

---

## 6. Provenance & Attribution

- **SeaClear Marine Debris Dataset**:
  Collected under the European Union's Horizon 2020 research and innovation programme (Grant Agreement No 871295, SEACLEAR).
  Attribution: TU Delft, Fraunhofer CML, University of Dubrovnik, Subsea Tech, Port of Hamburg.
  License: Academic Research Use Only.

- **TrashCan 1.0**:
  Collected and annotated by the Interactive Robotics and Vision Laboratory (IRVLab), University of Minnesota.
  Paper: *TrashCan: A Simulation-to-Real Dataset for Subsea Debris Detection* (Hong et al., 2020).
  License: Creative Commons Attribution 4.0 International (CC BY 4.0).
