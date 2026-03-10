# Data Pipeline Layer

This module boundary is reserved for dataset engineering and preprocessing workflows.

## Scope
- Satellite data ingestion and tiling
- Cloud masking and quality filters
- Band normalization and harmonization
- Augmentation pipelines
- Dataset manifest generation and versioning

## Rules
- Keep preprocessing deterministic when a seed is supplied.
- Do not mix UI concerns in this layer.
- Emit structured logs for each pipeline stage.
