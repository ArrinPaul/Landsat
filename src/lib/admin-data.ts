import type { UserRole } from "@/lib/auth";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Suspended";
  organization: string;
  joined: string;
  lastActive: string;
  preferences?: {
    primaryGoal?: string;
    favoriteRegion?: string;
    defaultIndex?: string;
  };
}

export interface LandsatDatasetRecord {
  id: string;
  name: string;
  code: string;
  category: "Vegetation" | "Water Resources" | "Urban & Land" | "Disaster & Wildfire" | "Climate";
  sensor: string;
  resolution: string;
  isActive: boolean;
  lastSynced: string;
  description: string;
  computeCount: number;
}

export interface AdminComputeJob {
  id: string;
  user: string;
  type: string;
  status: "Completed" | "Processing" | "Failed";
  latency: string;
  timestamp: string;
  tokensUsed?: number;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  type: "user" | "dataset" | "system" | "security";
  status: "Success" | "Warning" | "Denied";
  tokensUsed?: number;
}

export interface AdminSystemSettings {
  syncIntervalHours: number;
  maxConcurrentJobs: number;
  maintenanceMode: boolean;
  telemetryEnabled: boolean;
  cacheTtlMinutes: number;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isSuperAdmin: boolean;
}

export interface SyncRunLog {
  runId: string;
  startedAt: string;
  finishedAt: string;
  totalScenes: number;
  inserted: number;
  updated: number;
  durationSeconds: number;
  status: "Success" | "Running" | "Failed";
}

// Initial Mock Users
export const INITIAL_USERS: AdminUserRecord[] = [
  {
    id: "usr_admin_1",
    name: "Lead Geospatial Admin",
    email: "admin@earthinsights.nasa.gov",
    role: "admin",
    status: "Active",
    organization: "NASA Goddard Space Flight Center",
    joined: "2026-01-10",
    lastActive: "Just now",
    preferences: { primaryGoal: "Agriculture & Crop Yield", favoriteRegion: "Iowa Corn Belt", defaultIndex: "NDVI" },
  },
  {
    id: "usr_analyst_2",
    name: "Dr. Sarah Jenkins",
    email: "sarah.j@usda.gov",
    role: "analyst",
    status: "Active",
    organization: "USDA Agricultural Research Service",
    joined: "2026-02-14",
    lastActive: "10 mins ago",
    preferences: { primaryGoal: "Water Resource Monitoring", favoriteRegion: "Central Valley, CA", defaultIndex: "NDWI" },
  },
  {
    id: "usr_analyst_3",
    name: "Alex Rivera",
    email: "arivera@mit.edu",
    role: "analyst",
    status: "Active",
    organization: "MIT Earth, Atmospheric & Planetary Sciences",
    joined: "2026-03-01",
    lastActive: "2 hours ago",
    preferences: { primaryGoal: "Urban Planning & Development", favoriteRegion: "Boston Metro", defaultIndex: "NDBI" },
  },
  {
    id: "usr_viewer_4",
    name: "Mark Vance",
    email: "mvance@agritech.com",
    role: "viewer",
    status: "Active",
    organization: "AgriTech Global Solutions",
    joined: "2026-04-12",
    lastActive: "Yesterday",
    preferences: { primaryGoal: "Agriculture & Crop Yield", favoriteRegion: "Midwest Farmlands", defaultIndex: "NDVI" },
  },
  {
    id: "usr_viewer_5",
    name: "Elena Rostova",
    email: "elena@climatewatch.org",
    role: "viewer",
    status: "Suspended",
    organization: "Climate Watch International",
    joined: "2026-05-20",
    lastActive: "5 days ago",
    preferences: { primaryGoal: "Wildfire & Disaster Recovery", favoriteRegion: "Amazon Basin", defaultIndex: "NBR" },
  },
];

// Initial Landsat Datasets & Spectral Indices
export const INITIAL_DATASETS: LandsatDatasetRecord[] = [
  {
    id: "ds_ndvi",
    name: "Normalized Difference Vegetation Index",
    code: "NDVI",
    category: "Vegetation",
    sensor: "Landsat 8/9 OLI (Bands 5 & 4)",
    resolution: "30m Spatial",
    isActive: true,
    lastSynced: "2026-08-18 22:00 UTC",
    description: "Quantifies vegetation health and photosynthetic density from NIR and Red reflectance.",
    computeCount: 1420,
  },
  {
    id: "ds_ndwi",
    name: "Normalized Difference Water Index",
    code: "NDWI",
    category: "Water Resources",
    sensor: "Landsat 8/9 OLI (Bands 3 & 5)",
    resolution: "30m Spatial",
    isActive: true,
    lastSynced: "2026-08-18 22:00 UTC",
    description: "Delineates open water bodies and canopy water content with high accuracy.",
    computeCount: 890,
  },
  {
    id: "ds_nbr",
    name: "Normalized Burn Ratio",
    code: "NBR",
    category: "Disaster & Wildfire",
    sensor: "Landsat 8/9 OLI (Bands 5 & 7)",
    resolution: "30m Spatial",
    isActive: true,
    lastSynced: "2026-08-18 20:30 UTC",
    description: "Evaluates wildfire burn severity and post-disaster ecosystem recovery.",
    computeCount: 540,
  },
  {
    id: "ds_ndbi",
    name: "Normalized Difference Built-up Index",
    code: "NDBI",
    category: "Urban & Land",
    sensor: "Landsat 8/9 OLI (Bands 6 & 5)",
    resolution: "30m Spatial",
    isActive: true,
    lastSynced: "2026-08-18 19:15 UTC",
    description: "Highlights impervious surfaces and urban sprawl versus natural terrain.",
    computeCount: 680,
  },
  {
    id: "ds_thermal",
    name: "Thermal Infrared Brightness Temperature",
    code: "TIRS",
    category: "Climate",
    sensor: "Landsat 8/9 TIRS (Band 10)",
    resolution: "100m (resampled to 30m)",
    isActive: true,
    lastSynced: "2026-08-18 18:00 UTC",
    description: "Measures land surface temperature (LST) and urban heat island effects.",
    computeCount: 420,
  },
  {
    id: "ds_crop_ai",
    name: "AI Crop Yield Forecasting Model",
    code: "AGRI-AI",
    category: "Vegetation",
    sensor: "Multi-Sensor + Genkit AI",
    resolution: "Custom Grid",
    isActive: true,
    lastSynced: "2026-08-19 04:00 UTC",
    description: "Multi-modal predictive pipeline correlating weather, Landsat NDVI, and historical yields.",
    computeCount: 960,
  },
];

// Initial Compute Jobs
export const INITIAL_JOBS: AdminComputeJob[] = [
  { id: "job_9481", user: "analyst@nasa.gov", type: "NDVI Multi-Band Computation", status: "Completed", latency: "1.4s", timestamp: "2026-08-19 11:45:12", tokensUsed: 120 },
  { id: "job_9480", user: "sarah.j@usda.gov", type: "Soil Moisture AI Forecast", status: "Completed", latency: "3.2s", timestamp: "2026-08-19 11:30:45", tokensUsed: 310 },
  { id: "job_9479", user: "researcher@mit.edu", type: "Timelapse Video Render", status: "Processing", latency: "-", timestamp: "2026-08-19 11:24:02" },
  { id: "job_9478", user: "mvance@agritech.com", type: "Genkit Crop Advice AI", status: "Completed", latency: "0.8s", timestamp: "2026-08-19 11:15:18", tokensUsed: 450 },
  { id: "job_9477", user: "sarah.j@usda.gov", type: "NDWI Water Extraction", status: "Failed", latency: "5.1s", timestamp: "2026-08-19 10:50:30" },
  { id: "job_9476", user: "alex.r@mit.edu", type: "Urban Heat Island TIRS Analysis", status: "Completed", latency: "2.1s", timestamp: "2026-08-19 10:22:15", tokensUsed: 180 },
];

// Initial Audit Logs
export const INITIAL_LOGS: AdminActivityLog[] = [
  { id: "log_1094", timestamp: "2026-08-19 11:50:22", user: "admin@earthinsights.nasa.gov", action: "Landsat Catalog Sync Triggered", target: "USGS Landsat Collection 2 Tier 1", type: "dataset", status: "Success" },
  { id: "log_1093", timestamp: "2026-08-19 11:45:12", user: "analyst@nasa.gov", action: "NDVI Computation Pipeline", target: "Lat: 41.8781, Lon: -93.0977 (Iowa)", type: "dataset", status: "Success", tokensUsed: 120 },
  { id: "log_1092", timestamp: "2026-08-19 11:30:45", user: "sarah.j@usda.gov", action: "Crop Yield AI Scenario Execution", target: "Corn/Soybean Yield Forecast", type: "user", status: "Success", tokensUsed: 310 },
  { id: "log_1091", timestamp: "2026-08-19 11:10:00", user: "admin@earthinsights.nasa.gov", action: "User Role Modified", target: "sarah.j@usda.gov (viewer -> analyst)", type: "user", status: "Success" },
  { id: "log_1090", timestamp: "2026-08-19 10:45:10", user: "anonymous_ip_172.16", action: "Unauthorized Admin Route Access", target: "/admin/users", type: "security", status: "Denied" },
  { id: "log_1089", timestamp: "2026-08-19 10:20:30", user: "system_worker", action: "Automated Earth Engine Cache Prune", target: "1.4 GB expired tile cache", type: "system", status: "Success" },
];

// Initial Sync Runs
export const INITIAL_SYNC_RUNS: SyncRunLog[] = [
  { runId: "sync_8812", startedAt: "2026-08-19 06:00:00", finishedAt: "2026-08-19 06:04:12", totalScenes: 1420, inserted: 34, updated: 89, durationSeconds: 252, status: "Success" },
  { runId: "sync_8811", startedAt: "2026-08-18 18:00:00", finishedAt: "2026-08-18 18:03:45", totalScenes: 1386, inserted: 18, updated: 62, durationSeconds: 225, status: "Success" },
  { runId: "sync_8810", startedAt: "2026-08-18 06:00:00", finishedAt: "2026-08-18 06:04:02", totalScenes: 1368, inserted: 42, updated: 110, durationSeconds: 242, status: "Success" },
];

// Initial Admin Accounts
export const INITIAL_ADMINS: AdminAccount[] = [
  { id: "adm_1", name: "Lead Geospatial Admin", email: "admin@earthinsights.nasa.gov", createdAt: "2026-01-10", isSuperAdmin: true },
  { id: "adm_2", name: "NASA Security Officer", email: "security@nasa.gov", createdAt: "2026-02-01", isSuperAdmin: false },
];
