# Earth Insights TODO (Merged Execution List)

> Updated: 2026-03-10
> Source merge: legacy audit TODO + goal-driven roadmap in `docs/ROADMAP.md`.
> Working rule: execute in order, do not start downstream milestones until blockers are closed.

## 0. Program Alignment

- [ ] Confirm final KPI definitions for the five target goals.
- [ ] Freeze acceptance metrics:
  - [ ] Dataset quality metrics (cloud-free ratio, invalid tile ratio).
  - [ ] Scale metric for preprocessing throughput on >1TB workloads.
  - [ ] Segmentation quality metric set (mIoU, class IoU, pixel accuracy).
  - [ ] Dashboard UX metrics (response time and export success rate).
- [ ] Assign owner per milestone in `docs/ROADMAP.md`.

## 1. Critical Blockers (Carryover from Legacy Audit)

### Security and reliability
- [ ] Remove/guard all production `rejectUnauthorized: false` usage.
- [ ] Harden prompt-input handling against prompt injection in AI flows/tools.
- [ ] Keep CSV injection protection and add tests to prevent regressions.
- [ ] Prevent API key leakage through URLs and error logs.
- [ ] Make Firebase init lazy and fail-safe when credentials are absent.
- [ ] Ensure server-only modules are marked and not client-bundled.

### App correctness
- [ ] Fix remaining chatbot hook dependency warnings.
- [ ] Replace raw `<img>` in payment page with optimized image handling.
- [ ] Remove stale/dead comments and remaining dead code paths in actions/flows.
- [ ] Add robust error handling for all fire-and-forget async calls.

## 2. Foundation and DevOps (Roadmap Phase 0)

- [ ] Add `.env.example` documenting all required variables.
- [ ] Add `.nvmrc` and `engines` in `package.json`.
- [ ] Add CI pipeline (lint, typecheck, test, build).
- [ ] Add test framework baseline (Vitest + Testing Library, or equivalent).
- [ ] Add formatter config and pre-commit checks.
- [ ] Split architecture folders for `data-pipeline`, `ml`, and `app` concerns.
- [ ] Define log strategy (structured logs, levels, correlation IDs).

## 3. Data Pipeline for Clean Dataset Generation (Roadmap Phase 1)

### Cloud masking
- [ ] Implement Sentinel-2 cloud masking policy (SCL/QA-based).
- [ ] Add cloud coverage scoring per tile.
- [ ] Add reject/keep threshold config.

### Normalization and harmonization
- [ ] Implement band normalization pipeline with persisted stats.
- [ ] Add reprojection/resampling policy and metadata stamps.
- [ ] Validate normalization consistency across historical windows.

### Augmentation
- [ ] Implement augmentation pipeline (flip/rotate/crop/spectral perturbation).
- [ ] Add deterministic seed support for reproducibility.
- [ ] Add augmentation policy versioning in manifest.

### Automation and scale (>1TB)
- [ ] Build resumable chunked preprocessing jobs.
- [ ] Add retry-safe checkpoints and resume-from-last-success.
- [ ] Store manifests (input hash, transform version, output URI).
- [ ] Benchmark and validate >1TB run completion.

## 4. U-Net Segmentation Delivery (Roadmap Phase 2)

### ML training stack
- [ ] Create U-Net training module with configurable encoder depth.
- [ ] Add dataset split tooling and class distribution reports.
- [ ] Implement class imbalance mitigation (weighted/focal loss options).

### Evaluation and iteration
- [ ] Track mIoU and per-class IoU per run.
- [ ] Add experiment tracking and reproducible run configs.
- [ ] Run hyperparameter sweeps to approach >=88% target.

### Inference integration
- [ ] Package model artifact and define inference schema.
- [ ] Add post-processing for segmentation masks.
- [ ] Wire inference outputs into existing land cover analysis flow.

## 5. Serverless Batch on Google Cloud (Roadmap Phase 3)

- [ ] Define GCP architecture for batch orchestration.
- [ ] Implement Cloud Run Jobs for heavy preprocessing/training/inference batches.
- [ ] Implement Pub/Sub event-driven stage chaining.
- [ ] Implement Google Workflows for orchestration and retries.
- [ ] Add DLQ and idempotent job keys.
- [ ] Add observability: Cloud Logging, Monitoring dashboards, alerts.
- [ ] Add cost guardrails (budgets, quotas, lifecycle retention).

## 6. GIS Dashboard Maturity (Roadmap Phase 4)

### Visualization and analysis
- [ ] Add map-centric view with segmentation overlay layers.
- [ ] Add temporal slider and before/after comparison UX.
- [ ] Add anomaly/change heatmap representation.

### Product quality
- [ ] Add export options (CSV, report, geospatial artifact where relevant).
- [ ] Improve accessibility (aria, reduced motion, keyboard-first flows).
- [ ] Improve responsiveness/performance for large datasets.

## 7. Carryover Quality Backlog (Condensed from Legacy TODO)

### AI and flow quality
- [ ] Apply Zod parse validation at all flow boundaries.
- [ ] Standardize confidence scales across flows.
- [ ] Decompose oversized modules (`ai-utils`, `compute-metrics`, `predict/page.tsx`).
- [ ] Add timeouts and bounded retries in provider calls.

### Data and state correctness
- [ ] Persist dashboard history and chat history across refreshes.
- [ ] Persist language preference.
- [ ] Replace naive CSV parsing with robust quoted-field parser.

### UI/a11y/performance
- [ ] Remove bundle-heavy icon import pattern from weather report.
- [ ] Add `prefers-reduced-motion` support for animated backgrounds.
- [ ] Improve table responsiveness and sort accessibility.

## 8. Definition of Done per Milestone

- [ ] M1 done: no critical vulnerabilities open, CI green.
- [ ] M2 done: preprocessing pipeline produces clean dataset at >1TB scale.
- [ ] M3 done: U-Net reaches agreed >=88% validation target (or agreed equivalent metric).
- [ ] M4 done: serverless batch workflows run reliably with observability.
- [ ] M5 done: GIS dashboard supports segmentation overlays and trend analysis in production UX.

## 9. Deferred / Nice-to-Have

- [ ] Auth and protected routes completion.
- [ ] Real payment integration.
- [ ] Notification system for monitoring alerts.
- [ ] PWA/offline mode.
- [ ] Admin and usage analytics dashboard.
