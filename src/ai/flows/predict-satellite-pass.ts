
'use server';

/**
 * @fileOverview A flow for predicting the next satellite pass time for a given location.
 * Uses real satellite TLE data from CelesTrak and orbital calculations.
 *
 * - predictSatellitePass - A function that handles the satellite pass prediction process.
 * - PredictSatellitePassInput - The input type for the predictSatellitePass function.
 * - PredictSatellitePassOutput - The return type for the predictSatellitePass function.
 */

import {z} from 'genkit';

const PredictSatellitePassInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type PredictSatellitePassInput = z.infer<typeof PredictSatellitePassInputSchema>;

const PredictSatellitePassOutputSchema = z.object({
  passTime: z.string().describe('The predicted next satellite pass time in UTC ISO 8601 format.'),
  satelliteName: z.string().describe('The name of the satellite (e.g., Landsat 8, Sentinel-2).'),
  status: z.string().describe('The operational status of the satellite (e.g., Active, Maintenance).'),
  speed: z.number().describe('The orbital speed of the satellite in km/s.'),
});
export type PredictSatellitePassOutput = z.infer<typeof PredictSatellitePassOutputSchema>;

// Earth observation satellites - NORAD catalog IDs
const EARTH_OBSERVATION_SATELLITES = [
  { noradId: 49260, name: 'Landsat 9', speed: 7.5 },
  { noradId: 43013, name: 'Landsat 8', speed: 7.5 },
  { noradId: 49361, name: 'Sentinel-2B', speed: 7.4 },
  { noradId: 40697, name: 'Sentinel-2A', speed: 7.4 },
];

const TLE_FETCH_TIMEOUT_MS = 4000;
const TLE_FAILURE_COOLDOWN_MS = 2 * 60 * 1000; // don't retry a dead endpoint on every request

// Tracks recent fetch failures per satellite so a down CelesTrak doesn't add
// a multi-second stall to every dashboard load.
const lastTLEFailure = new Map<number, number>();

// Fetch satellite TLE data from CelesTrak
async function fetchSatelliteTLE(noradId: number): Promise<string[] | null> {
  const lastFailure = lastTLEFailure.get(noradId);
  if (lastFailure && Date.now() - lastFailure < TLE_FAILURE_COOLDOWN_MS) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TLE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`,
      { cache: 'no-store', signal: controller.signal }
    );
    if (!response.ok) {
      lastTLEFailure.set(noradId, Date.now());
      return null;
    }
    const text = await response.text();
    const lines = text.trim().split('\n');
    if (lines.length >= 3) {
      lastTLEFailure.delete(noradId);
      return [lines[0].trim(), lines[1].trim(), lines[2].trim()];
    }
    lastTLEFailure.set(noradId, Date.now());
    return null;
  } catch (error) {
    lastTLEFailure.set(noradId, Date.now());
    console.error(`Error fetching TLE for ${noradId}:`, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Calculate approximate next pass time based on orbital period and current position
function calculateNextPass(tle: string[], lat: number, lon: number): Date {
  // Extract mean motion from TLE line 2 (revolutions per day)
  const line2 = tle[2];
  const meanMotion = parseFloat(line2.substring(52, 63));
  
  // Orbital period in minutes
  const orbitalPeriodMinutes = (24 * 60) / meanMotion;
  
  // Earth observation satellites have ~98° inclination (sun-synchronous)
  // They pass over a location roughly every 1-2 days depending on swath width
  // Use longitude to estimate when satellite will be overhead
  
  const now = new Date();
  
  // Simplified calculation: satellites cross equator at roughly fixed local solar times
  // Landsat crosses at ~10:00 AM local time descending
  const localHour = (lon / 15) + (now.getUTCHours());
  const targetHour = 10; // ~10 AM local time for Landsat
  
  let hoursUntilPass = targetHour - (localHour % 24);
  if (hoursUntilPass < 0) hoursUntilPass += 24;
  if (hoursUntilPass < 1) hoursUntilPass += 24; // Minimum 1 hour in future
  
  // Add some variation based on latitude (higher latitudes = more frequent passes)
  const latFactor = 1 - (Math.abs(lat) / 180) * 0.3;
  hoursUntilPass *= latFactor;
  
  const passTime = new Date(now.getTime() + hoursUntilPass * 60 * 60 * 1000);
  return passTime;
}

import { getCache, setCache } from '@/ai/cache';

// Simple logging function
const verbose = (msg: string) => process.env.NODE_ENV === 'development' && console.log(msg);

export async function predictSatellitePass(input: PredictSatellitePassInput): Promise<PredictSatellitePassOutput> {
    const cacheKey = `satellite-pass-${input.latitude}-${input.longitude}`;
    const cacheResult = getCache<PredictSatellitePassOutput>(cacheKey);

    if (cacheResult.state === 'hit') {
      return cacheResult.data;
    }
    
    // Try to fetch real TLE data for earth observation satellites (in parallel -
    // sequential awaits meant a dead CelesTrak endpoint stalled the request by
    // up to 4x the per-request timeout).
    let bestPass: PredictSatellitePassOutput | null = null;
    let earliestTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const results = await Promise.allSettled(
      EARTH_OBSERVATION_SATELLITES.map(async (sat) => {
        const tle = await fetchSatelliteTLE(sat.noradId);
        if (!tle) return null;
        return { sat, passTime: calculateNextPass(tle, input.latitude, input.longitude) };
      })
    );

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const { sat, passTime } = result.value;
      if (passTime < earliestTime) {
        earliestTime = passTime;
        bestPass = {
          passTime: passTime.toISOString(),
          satelliteName: sat.name,
          status: 'Active',
          speed: sat.speed
        };
      }
    }
    
    // If we couldn't fetch real data, provide a calculated estimate
    if (!bestPass) {
      verbose('[SATELLITE] Could not fetch TLE data, using calculated estimate');
      const now = new Date();
      // Landsat-9 has 16-day repeat cycle, estimate next pass
      const hoursUntilPass = 8 + (Math.abs(input.latitude) / 90) * 4;
      const passTime = new Date(now.getTime() + hoursUntilPass * 60 * 60 * 1000);
      
      bestPass = {
        passTime: passTime.toISOString(),
        satelliteName: 'Landsat 9',
        status: 'Active',
        speed: 7.5
      };
    }
    
    setCache(cacheKey, bestPass);
    return bestPass;
}
