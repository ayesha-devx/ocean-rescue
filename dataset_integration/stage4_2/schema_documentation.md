# OceanRescue Stage 4.2: Unified Underwater Annotation Schema Documentation

## 1. Overview & Objectives

The OceanRescue project requires integrating multiple heterogeneous underwater computer vision datasets—specifically **SeaClear** (8,610 high-resolution field ROV images) and **TrashCan 1.0** (7,212 underwater ROV images across 312 video sequences)—into a single, consolidated, and scientifically rigorous framework.

The primary target is detecting **Abandoned, Lost, or Discarded Fishing Gear (ALDFG)**, specifically:
1. `fishing_net` (ghost nets, gillnets, netting fragments)
2. `rope_line` (synthetic and fiber lines, cordage, buoy ropes)
3. General marine debris (bottles, bags, cans, containers, wreckage, pipes, tarps, clothing)
4. Explicit handling of uncertain items (`cable_metal`) and exclusion of non-debris (ROV equipment and marine biology).

---

## 2. Shared Target Taxonomy

| Target ID | Target Class Name | Target Supercategory | Description | Debris? | Source Classes |
|:---:|:---|:---|:---|:---:|:---|
| **1** | `fishing_net` | `aldfg_priority` | Ghost nets, gillnets, netting debris | **YES** | SeaClear `net_plastic` (960), TrashCan `trash_net` (127) |
| **2** | `rope_line` | `aldfg_priority` | Fiber/synthetic cordage, mooring lines | **YES** | SeaClear `rope_fiber` (2,039), `rope_plastic` (8), TrashCan `trash_rope` (117) |
| **--** | `trap_cage` | `unsupported_aldfg` | Pots, traps, cages | **N/A** | **UNSUPPORTED**: Absent in SeaClear; collapsed to `trash_unknown_instance` in TrashCan COCO |
| **3** | `debris_bottle` | `marine_debris_general` | Plastic and glass beverage bottles | **YES** | SeaClear `bottle_plastic` (1,261), `bottle_glass` (2,331), TrashCan `trash_bottle` (126) |
| **4** | `debris_bag` | `marine_debris_general` | Plastic bags, shopping bags | **YES** | SeaClear `bag_plastic` (882), TrashCan `trash_bag` (908) |
| **5** | `debris_can` | `marine_debris_general` | Metal food and drink cans | **YES** | SeaClear `can_metal` (1,130), TrashCan `trash_can` (459) |
| **6** | `debris_container` | `marine_debris_general` | Buckets, tubs, drums, jugs | **YES** | SeaClear `container_plastic` (84), `container_middle_size_metal` (60), TrashCan `trash_container` (510) |
| **7** | `debris_cup` | `marine_debris_general` | Plastic, paper, ceramic cups | **YES** | SeaClear `cup_plastic` (329), `cup_ceramic` (123), TrashCan `trash_cup` (59) |
| **8** | `debris_pipe` | `marine_debris_general` | Rigid plastic/metal pipes | **YES** | SeaClear `pipe_plastic` (155), TrashCan `trash_pipe` (156) |
| **9** | `debris_snack_wrapper` | `marine_debris_general` | Chip packets, candy wrappers | **YES** | SeaClear `snack_wrapper_plastic` (172), `snack_wrapper_paper` (8), TrashCan `trash_snack_wrapper` (84) |
| **10** | `debris_clothing` | `marine_debris_general` | Fabrics, clothes, textiles | **YES** | SeaClear `clothing_fiber` (298), TrashCan `trash_clothing` (82) |
| **11** | `debris_tarp` | `marine_debris_general` | Plastic sheets and tarpaulins | **YES** | SeaClear `tarp_plastic` (31), TrashCan `trash_tarp` (121) |
| **12** | `debris_wreckage` | `marine_debris_general` | Wreckage scrap, submerged structures | **YES** | SeaClear `wreckage_metal` (265), TrashCan `trash_wreckage` (165) |
| **13** | `debris_branch_wood` | `marine_debris_general` | Submerged tree branches, wood | **YES** | SeaClear `branch_wood` (430), TrashCan `trash_branch` (336) |
| **14** | `debris_other` | `marine_debris_general` | Tires, bricks, cement tubes, jars, footwear, unclassified debris | **YES** | SeaClear 10 classes (6,087), TrashCan `trash_unknown_instance` (2,756) |
| **15** | `uncertain_cable_metal` | `uncertain_infrastructure` | Heavy industrial metal cables | **NO (UNCERTAIN)** | SeaClear `cable_metal` (149). Retained separate; NOT merged into rope or ROV |
| **101** | `rov_equipment` | `rov_equipment_excluded` | ROV thrusters, chassis, umbilical, legs | **NO (EXCLUDED)** | SeaClear 4 classes (963), TrashCan `rov` (3,317) |
| **201** | `marine_biology` | `marine_bio_excluded` | Urchins, fish, sponges, crabs, corals | **NO (EXCLUDED)** | SeaClear 7 classes (13,790), TrashCan 8 classes (2,805) |

---

## 3. Schema Data Fields Specification

### 3.1. `images` Object

```json
{
  "id": "seaclear_1",
  "source_dataset": "seaclear",
  "source_image_id": 1,
  "file_name": "1.jpg",
  "relative_path": "Bistrina/Bluerobotics HD/1.jpg",
  "absolute_path": "C:/Users/.../sea clear dataset/Seaclear Marine Debris Dataset/Bistrina/Bluerobotics HD/1.jpg",
  "width": 1920,
  "height": 1080,
  "site": "Bistrina",
  "camera": "Bluerobotics HD",
  "sequence_id": "bistrina_bluerobotics_hd",
  "split_group": "bistrina_bluerobotics_hd",
  "planned_split": "train"
}
```

- `id`: Globally unique image ID formatted as `<source_dataset>_<source_image_id>`.
- `source_dataset`: Either `seaclear` or `trashcan_instance`.
- `source_image_id`: Original integer image ID from the source COCO JSON.
- `file_name`: Basename of the file.
- `relative_path`: Path from the respective dataset root directory.
- `absolute_path`: Full canonical filesystem path on the local environment.
- `width`, `height`: Image resolution in pixels.
- `site`: Geographic deployment site (e.g., `Bistrina`, `Marseille`, `Lokrum`, `Jakljan`, `Slano` for SeaClear; `null` for TrashCan).
- `camera`: Camera sensor hardware (e.g., `Bluerobotics HD`, `Paralenz Vaquita Gen 2`, `SIP-E323CV` for SeaClear; `null` for TrashCan).
- `sequence_id`: Sequence group identifier (`vid_XXXXXX` for TrashCan; `<site>_<camera>` for SeaClear).
- `split_group`: Identical to or derived from `sequence_id` to ensure atomic split assignment without data leakage.
- `planned_split`: Target split: `"train"`, `"val"`, or `"test"`.

### 3.2. `annotations` Object

```json
{
  "id": "seaclear_ann_1402",
  "image_id": "seaclear_1",
  "source_dataset": "seaclear",
  "source_ann_id": 1402,
  "source_category_id": 14,
  "source_category_name": "net_plastic",
  "target_category_id": 1,
  "target_category_name": "fishing_net",
  "target_supercategory": "aldfg_priority",
  "mapping_status": "DIRECT_MAPPED",
  "is_environmental_debris": true,
  "bbox": [100.5, 200.0, 350.2, 420.0],
  "segmentation": [[100.5, 200.0, 450.7, 200.0, 450.7, 620.0, 100.5, 620.0]],
  "area": 147084.0,
  "iscrowd": 0
}
```

- `id`: Globally unique annotation ID (`<source_dataset>_ann_<source_ann_id>`).
- `image_id`: Foreign key reference to `images.id`.
- `source_category_id` & `source_category_name`: Preserves 100% of the original dataset taxonomy.
- `target_category_id` & `target_category_name`: Mapped OceanRescue category.
- `target_supercategory`: Broad taxonomic tier (`aldfg_priority`, `marine_debris_general`, `uncertain_infrastructure`, `rov_equipment_excluded`, `marine_bio_excluded`).
- `mapping_status`: Traceability flag:
  - `DIRECT_MAPPED`: 1-to-1 semantic equivalence (e.g. `net_plastic` -> `fishing_net`).
  - `MERGED_MAPPED`: Multiple fine source classes unified into a cohesive target (e.g. `rope_fiber` + `rope_plastic` -> `rope_line`).
  - `EXCLUDED_ROV`: Hardware/vehicle annotation filtered out from environmental debris.
  - `EXCLUDED_BIO`: Marine organism annotation filtered out from debris.
  - `UNCERTAIN_AMBIGUOUS`: Class with ambiguous identity (`cable_metal`).
- `is_environmental_debris`: Boolean filter flag for debris detection models (`true` for debris, `false` for ROV/bio/uncertain).
- `bbox`: Standard COCO format `[x_min, y_min, width, height]` in pixels.
- `segmentation`: Polygon list `[[x1, y1, x2, y2, ...]]`.
- `area`: Bounding polygon area in square pixels.
- `iscrowd`: Standard COCO flag (0 = individual instance polygon, 1 = crowd RLE mask).

---

## 4. Path Resolution Strategy for SeaClear

### The Issue
In SeaClear's `dataset.json`, the `images` table lists bare filenames without subdirectories (e.g., `1.jpg`, `Cam1_16_23_22_10_11_2020.mp4_00831.jpg`). On disk, the 8,610 images are partitioned across 5 site folders and 9 site/camera pairs.

### Resolution Protocol
1. Scan all 9 site/camera leaf subdirectories once at initialization.
2. Build an in-memory hash dictionary mapping `basename -> (site, camera, relative_path, absolute_path)`.
3. Verify uniqueness: check that no duplicate basenames exist across distinct directories.
   - **Empirical audit result**: Exactly 8,610 unique basenames. Zero name collisions. Zero missing files. 100% match.

---

## 5. Preventing Train/Validation Data Leakage

### 5.1. TrashCan Video Sequence Leakage Discovery
In the original TrashCan 1.0 distribution, images are extracted from underwater video clips with names like `vid_000159_frame0000008.jpg`.
- Our audit detected **113 video sequences overlapping** between the official `instances_train_trashcan.json` (310 sequences) and `instances_val_trashcan.json` (115 sequences).
- **98.3% of validation sequences also exist in the training set!**
- This represents severe temporal leakage: nearly identical frames of the same debris item captured fractions of a second apart appear in both train and validation sets, inflating validation mAP scores.

### 5.2. Unified Zero-Leakage Split Strategy
To eliminate leakage, images must be partitioned at the **group level**, not at the random frame level:

1. **TrashCan Grouping**:
   - Split key: `video_id` (e.g., `vid_000159`).
   - All frames from a given `video_id` are strictly assigned to either Train or Validation.
   - Stratified sequence assignment ensures that rare classes (especially `trash_net` and `trash_rope`) are well-distributed across train and val without splitting any single video sequence across sets.

2. **SeaClear Grouping**:
   - Split key: `site_camera` deployment pair (or distinct transect run).
   - Deployment groups (e.g., `Bistrina/SIP-E323CV`, `Marseille/SIP-E323CV`, etc.) are held out atomically, ensuring the model is validated on unseen underwater cameras, water clarities, and bottom substrates.
