# OceanRescue: Priority ALDFG Google Colab Training Package

This package contains the pre-processed, zero-leakage instance segmentation dataset for training subsea ALDFG (Abandoned, Lost, or Discarded Fishing Gear) detectors on Google Colab GPU instances.

---

## 1. Dataset Profile

- **Target Classes**:
  - `0: fishing_net` (Submerged ghost nets, gillnets, netting fragments)
  - `1: rope_line` (Submerged fiber and synthetic ropes, mooring lines, buoy cordage)
- **Dataset Partition (Zero-Leakage Split)**:
  - **Train**: 2,115 images | 1,040 nets | 2,069 ropes
  - **Val**: 110 images | 47 nets | 95 ropes
  - **Total**: 2,225 images | 1,087 nets | 2,164 ropes
- **Format**: Ultralytics YOLOv8-seg / YOLOv11-seg normalized polygon coordinates.
- **Excluded Categories**: Marine biology, ROV equipment, general non-gear debris, and ambiguous cables are excluded from this first targeted model.

---

## 2. Directory Layout

```
colab_training_package/
├── data.yaml                     # Ultralytics dataset configuration
├── README.md                     # Setup and execution guide
├── train_colab_oceanrescue.ipynb # 1-Click interactive Jupyter Notebook for Colab
├── images/
│   ├── train/                    # 2,115 training images
│   └── val/                      # 110 validation images
└── labels/
    ├── train/                    # 2,115 YOLO segmentation label files (.txt)
    └── val/                      # 110 YOLO segmentation label files (.txt)
```

---

## 3. Quickstart Guide in Google Colab (Step-by-Step)

### Step 1: Open Google Colab & Select GPU
1. Go to [https://colab.research.google.com](https://colab.research.google.com).
2. Go to **Runtime** > **Change runtime type** > Select **T4 GPU** (or A100/V100) > Click **Save**.

### Step 2: Upload and Unzip the Dataset Package
Upload `colab_training_package.zip` directly in Colab's file browser or via Google Drive:

```python
# Unzip dataset to /content/
!unzip -q /content/colab_training_package.zip -d /content/colab_training_package
```

### Step 3: Install Ultralytics
```bash
!pip install ultralytics opencv-python pycocotools
```

### Step 4: Verify GPU & Dataset Configuration
```python
import torch
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
```

### Step 5: Start Model Training
Run YOLOv8-seg (Small or Medium recommended for initial benchmark):

```bash
yolo segment train \
    data=/content/colab_training_package/data.yaml \
    model=yolov8s-seg.pt \
    epochs=50 \
    imgsz=640 \
    batch=16 \
    device=0 \
    project=OceanRescue_ALDFG \
    name=yolov8s_seg_run1
```

### Step 6: Validate & Inspect Metrics
```bash
yolo segment val \
    data=/content/colab_training_package/data.yaml \
    model=OceanRescue_ALDFG/yolov8s_seg_run1/weights/best.pt \
    imgsz=640 \
    device=0
```

### Step 7: Run Test Inference on Validation Images
```bash
yolo segment predict \
    model=OceanRescue_ALDFG/yolov8s_seg_run1/weights/best.pt \
    source=/content/colab_training_package/images/val \
    save=True \
    conf=0.25
```

---

## 4. Provenance & Attribution
- **SeaClear**: EU Horizon 2020 project (Grant No 871295). Academic use only.
- **TrashCan 1.0**: IRVLab, University of Minnesota (Hong et al., 2020). Creative Commons Attribution 4.0 International (CC BY 4.0).
