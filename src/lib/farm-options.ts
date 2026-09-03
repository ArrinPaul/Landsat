// Single source of truth for farm-profile field options, shared between the onboarding
// wizard (src/app/onboarding/page.tsx) and the settings farm-profile form
// (src/components/profile-form.tsx) — both edit the same underlying profile data.
export const CROP_OPTIONS = ["Wheat", "Rice", "Cotton", "Sugarcane", "Maize", "Pulses", "Vegetables", "Fruits"];
export const GOAL_OPTIONS = [
  "Increase yield",
  "Reduce water usage",
  "Detect crop stress early",
  "Plan irrigation schedules",
  "Track field health over time",
];
export const IRRIGATION_OPTIONS = ["Rain-fed", "Canal", "Borewell / tube well", "Drip", "Sprinkler"];
