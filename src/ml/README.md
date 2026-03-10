# ML Layer

This module boundary is reserved for model training, evaluation, and inference logic.

## Scope
- Model architecture definitions (for example U-Net)
- Training loops and experiment configs
- Evaluation metrics and reports
- Model artifact packaging
- Inference adapters consumed by app services

## Rules
- Keep data access abstracted through pipeline manifests.
- Track metrics by dataset and model version.
- Ensure reproducibility for every promoted model artifact.
