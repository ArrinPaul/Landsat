
'use server';


/**
 * @fileOverview A flow for computing environmental metrics using Google Earth Engine.
 * This has been refactored to support asynchronous job processing.
 * - startMetricsComputation - Kicks off a new analysis job.
 * - getMetricsResult - Fetches the result of a completed job.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import ee from '@google/earthengine';
import { getHistoricalWeather } from '@/services/open-meteo';
import type { HistoricalDataPoint } from '@/lib/types';
import { analyzeChange, AnalyzeChangeOutput } from '@/ai/flows/analyze-change';
import { getHistoricalBaseline } from '@/ai/tools/get-historical-baseline';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/security';
import { getPercentageChange } from '@/ai/flows/compute-metrics-helpers';
import { enqueueJob, queueDepth } from '@/lib/job-queue';
import { getSupabase } from '@/lib/supabase';

// Use Supabase for job results to support serverless deployments.
const JOBS_TABLE = 'analysis_jobs';

// In-memory fallback for local development or when Supabase is unavailable
const memoryJobs = (globalThis as any).memoryJobs || new Map<string, any>();
(globalThis as any).memoryJobs = memoryJobs;

const DataPointSchema = z.object({
  date: z.string(),
  value: z.number().nullable(),
});

const LandCoverChangeStatSchema = z.object({
    startArea: z.number(),
    endArea: z.number(),
    absoluteChange: z.number(),
    percentageChange: z.number(),
});

const SatelliteSourceSchema = z.enum(['sentinel2', 'landsat', 'modis']);
export type SatelliteSource = z.infer<typeof SatelliteSourceSchema>;

const ComputeMetricsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  startDate: z.string().describe('The start date of the date range (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the date range (YYYY-MM-DD).'),
  // Radius (meters) of the area of interest around the point. Defaults to a tight, field-scale
  // footprint rather than an entire city.
  radiusMeters: z.number().min(10).max(2000).default(100),
  satelliteSource: SatelliteSourceSchema.default('sentinel2'),
});
export type ComputeMetricsInput = z.infer<typeof ComputeMetricsInputSchema>;

const timeSeriesSchema = z.object({
    NDVI: z.array(DataPointSchema).describe('The computed time-series data for NDVI.'),
    NDWI: z.array(DataPointSchema).describe('The computed time-series data for NDWI.'),
    NDBI: z.array(DataPointSchema).describe('The computed time-series data for NDBI.'),
    NBR: z.array(DataPointSchema).describe('The computed time-series data for NBR.'),
    B1: z.array(DataPointSchema),
    B2: z.array(DataPointSchema),
    B3: z.array(DataPointSchema),
    B4: z.array(DataPointSchema),
    B5: z.array(DataPointSchema),
    B6: z.array(DataPointSchema),
    B7: z.array(DataPointSchema),
    B8: z.array(DataPointSchema),
    B8A: z.array(DataPointSchema),
    B9: z.array(DataPointSchema),
    B11: z.array(DataPointSchema),
    B12: z.array(DataPointSchema),
});

const HistoricalDataPointSchema = z.object({
  date: z.string(),
  temperature: z.number().nullable(),
  precipitation: z.number().nullable(),
});

// Define the schema for the change analysis output (simplified version of what's in analyze-change.ts)
const ChangeAnalysisSchema = z.object({
    classification: z.enum(['Normal', 'Transitional', 'Concerning', 'Critical']),
    confidenceScore: z.number(),
    explanation: z.string(),
    recommendedAction: z.string(),
});

const ComputeMetricsOutputSchema = z.object({
    satelliteSource: SatelliteSourceSchema.optional(),
    radiusMeters: z.number().optional(),
    timeSeries: timeSeriesSchema,
    landCover: z.object({
        vegetation: LandCoverChangeStatSchema,
        water: LandCoverChangeStatSchema,
        builtUp: LandCoverChangeStatSchema,
        other: LandCoverChangeStatSchema,
        beforeMapUrl: z.string().url().describe('A data URI of the land cover map at the start date.'),
        afterMapUrl: z.string().url().describe('A data URI of the land cover map at the end date.'),
        highResMapUrl: z.string().url().optional().describe('An optional sub-meter true-color NAIP thumbnail (US coverage only) of the area of interest.'),
    }),
    historicalWeather: z.array(HistoricalDataPointSchema),
    changeAnalysis: ChangeAnalysisSchema.optional(),
        segmentationInference: z
            .object({
                mask: z.array(z.number().int()),
                width: z.number().int(),
                height: z.number().int(),
                meanConfidence: z.number(),
                classConfidence: z.record(z.string(), z.number()),
                postProcessing: z.object({
                    smoothingKernel: z.number().int(),
                    isolatedPixelFixes: z.number().int(),
                }),
                model: z.object({
                    modelId: z.string(),
                    version: z.string(),
                    configHash: z.string(),
                }),
            })
            .optional(),
        changeHeatmap: z
            .object({
                grid: z.array(z.number()),
                width: z.number().int(),
                height: z.number().int(),
            })
            .optional(),
});
export type ComputeMetricsOutput = z.infer<typeof ComputeMetricsOutputSchema>;


const StartComputationOutputSchema = z.object({
    jobId: z.string(),
});
export type StartComputationOutput = z.infer<typeof StartComputationOutputSchema>;

const JobResultOutputSchema = z.object({
    status: z.enum(['pending', 'completed', 'error']),
    result: ComputeMetricsOutputSchema.optional(),
    error: z.string().optional(),
});
export type JobResultOutput = z.infer<typeof JobResultOutputSchema>;


// This function starts the computation and immediately returns a job ID.
export async function startMetricsComputation(input: ComputeMetricsInput): Promise<StartComputationOutput> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
      const supabase = getSupabase();
      // Initialize job in Supabase
      const { error: insertError } = await supabase.from(JOBS_TABLE).insert({
        id: jobId,
        status: 'pending',
        created_at: new Date().toISOString(),
        input: input
      });
      if (insertError) {
          console.error("Failed to insert job into Supabase, falling back to memory:", insertError);
          memoryJobs.set(jobId, { status: 'pending', input });
      }
  } catch (err) {
      console.error("Supabase not available, using memory store:", err);
      memoryJobs.set(jobId, { status: 'pending', input });
  }

  // Do not await this. Let it run in the background.
    enqueueJob(() => computeMetricsFlow(input, jobId)).catch((e: unknown) => {
        logger.error('metrics_background_flow_failed', {
            scope: 'ai.flows.compute-metrics',
            jobId,
            queueDepth: queueDepth(),
            error: redactSensitive(e instanceof Error ? e.message : String(e)),
        });
    });

  return { jobId };
}

// This function retrieves the result of a computation.
export async function getMetricsResult(jobId: string): Promise<JobResultOutput> {
    try {
        if (memoryJobs.has(jobId)) {
            const job = memoryJobs.get(jobId);
            if (job.status === 'completed') return { status: 'completed', result: job.data };
            if (job.status === 'error') return { status: 'error', error: job.error };
            return { status: 'pending' };
        }

        const supabase = getSupabase();
        const { data: job, error } = await supabase.from(JOBS_TABLE).select('*').eq('id', jobId).single();

        if (error || !job) {
            return { status: 'error', error: 'Job not found.' };
        }

        if (job.status === 'completed') {
            return { status: 'completed', result: job.data };
        }

        if (job.status === 'error') {
            return { status: 'error', error: job.error };
        }
        
        return { status: 'pending' };
    } catch (error: any) {
        const safeError = redactSensitive(error?.message || String(error));
        logger.error('metrics_result_fetch_failed', { scope: 'ai.flows.compute-metrics', jobId, error: safeError });
        return { status: 'error', error: `Failed to fetch job status: ${safeError}` };
    }
}


// Promisify the ee.data.authenticateViaPrivateKey and ee.initialize functions
const authenticate = (key: any) => new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(key, () => resolve(), (err: string) => reject(new Error(err)));
});

const initialize = () => new Promise<void>((resolve, reject) => {
    ee.initialize(null, null, () => resolve(), (err: string) => reject(new Error(err)));
});

// Wraps a single ee.evaluate() call with retries + exponential backoff, since Earth Engine's
// own generic "Please try again" error is a transient/timeout signal, not a fatal one.
function evaluateWithRetry(eeObject: any, description: string, retries = 3): Promise<any> {
    return new Promise((resolve, reject) => {
        const attempt = (remaining: number) => {
            eeObject.evaluate((result: any, error: any) => {
                if (error) {
                    if (remaining > 0) {
                        const delayMs = (retries - remaining + 1) * 1500;
                        setTimeout(() => attempt(remaining - 1), delayMs);
                        return;
                    }
                    reject(new Error(`Earth Engine Error during ${description}: ${error}`));
                    return;
                }
                resolve(result);
            });
        };
        attempt(retries);
    });
}

// Canonical output band slots (B1..B12, matching the original Sentinel-2 band names). Each
// satellite source maps whichever of its own native bands are the closest optical match into
// these slots; slots a source has no equivalent for are simply left empty for that run.
const CANONICAL_BANDS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'];

interface SatelliteConfig {
    scale: number;
    getCollection: (areaOfInterest: any, startDate: string, endDate: string) => any;
    // Native band name for each canonical slot this source supports.
    bandMap: Partial<Record<string, string>>;
    // Native band names used for the NDVI/NDWI/NDBI/NBR normalized-difference indices.
    indexBands: { ndvi: [string, string]; ndwi: [string, string]; ndbi: [string, string]; nbr: [string, string] };
    trueColor: { bands: [string, string, string]; min: number; max: number };
    cloudProperty?: string;
    cloudThreshold?: number;
    // Optional Landsat-style scale/offset applied to raw DN before use (reflectance = DN * scale + offset).
    reflectanceScale?: { scale: number; offset: number };
}

const SATELLITE_CONFIGS: Record<SatelliteSource, SatelliteConfig> = {
    // 10m/pixel, revisit ~5 days. Best default balance of resolution and revisit frequency.
    sentinel2: {
        scale: 10,
        cloudProperty: 'CLOUDY_PIXEL_PERCENTAGE',
        cloudThreshold: 75,
        getCollection: (areaOfInterest, startDate, endDate) =>
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(areaOfInterest)
                .filterDate(startDate, endDate),
        bandMap: { B1: 'B1', B2: 'B2', B3: 'B3', B4: 'B4', B5: 'B5', B6: 'B6', B7: 'B7', B8: 'B8', B8A: 'B8A', B9: 'B9', B11: 'B11', B12: 'B12' },
        indexBands: { ndvi: ['B8', 'B4'], ndwi: ['B3', 'B8'], ndbi: ['B11', 'B8'], nbr: ['B8A', 'B12'] },
        trueColor: { bands: ['B4', 'B3', 'B2'], min: 0, max: 3000 },
    },
    // 30m/pixel, revisit ~8 days combining Landsat 8 + 9. Longest historical heritage of any
    // free optical archive, and adds a shortwave-infrared perspective Sentinel-2 also has but at
    // coarser native resolution.
    landsat: {
        scale: 30,
        cloudProperty: 'CLOUD_COVER',
        cloudThreshold: 75,
        reflectanceScale: { scale: 0.0000275, offset: -0.2 },
        getCollection: (areaOfInterest, startDate, endDate) =>
            ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
                .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
                .filterBounds(areaOfInterest)
                .filterDate(startDate, endDate),
        bandMap: { B1: 'SR_B1', B2: 'SR_B2', B3: 'SR_B3', B4: 'SR_B4', B5: 'SR_B5', B6: 'SR_B6', B7: 'SR_B7' },
        indexBands: { ndvi: ['SR_B5', 'SR_B4'], ndwi: ['SR_B3', 'SR_B5'], ndbi: ['SR_B6', 'SR_B5'], nbr: ['SR_B5', 'SR_B7'] },
        trueColor: { bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.3 },
    },
    // ~500m/pixel, daily revisit. Coarse resolution but a real second/independent sensor with
    // the densest historical time-series of the three, useful for long-baseline trend context.
    modis: {
        scale: 500,
        getCollection: (areaOfInterest, startDate, endDate) =>
            ee.ImageCollection('MODIS/061/MOD09GA')
                .filterBounds(areaOfInterest)
                .filterDate(startDate, endDate),
        bandMap: { B2: 'sur_refl_b04', B3: 'sur_refl_b03', B4: 'sur_refl_b01', B5: 'sur_refl_b02', B6: 'sur_refl_b06', B7: 'sur_refl_b07' },
        indexBands: { ndvi: ['sur_refl_b02', 'sur_refl_b01'], ndwi: ['sur_refl_b04', 'sur_refl_b02'], ndbi: ['sur_refl_b06', 'sur_refl_b02'], nbr: ['sur_refl_b02', 'sur_refl_b07'] },
        trueColor: { bands: ['sur_refl_b01', 'sur_refl_b04', 'sur_refl_b03'], min: 0, max: 3000 },
        reflectanceScale: { scale: 0.0001, offset: 0 },
    },
};

// Picks a thumbnail resolution that roughly matches the source's native pixel size instead of
// always requesting a fixed 512x512 image. Requesting far more output pixels than the sensor
// actually has (e.g. a 512px thumbnail over a 100m-wide, 30m-native-resolution Landsat scene)
// just blows each real pixel up into a giant, blocky square - this keeps ~2x oversampling
// (for smoothing headroom) instead, clamped to a sane min/max for the UI.
function pickThumbDimension(areaDiameterMeters: number, nativeResolutionMeters: number): number {
    const idealPixels = (areaDiameterMeters * 2) / nativeResolutionMeters;
    return Math.round(Math.min(1024, Math.max(256, idealPixels)));
}

// Sub-meter true-color aerial imagery (USDA NAIP), US coverage only. Purely additive: when the
// area of interest falls outside NAIP coverage or no scene is available, this resolves to null
// instead of failing the whole analysis.
async function tryGetNaipThumbnail(areaOfInterest: any, radiusMeters: number): Promise<string | null> {
    try {
        const naip = ee.ImageCollection('USDA/NAIP/DOQQ').filterBounds(areaOfInterest);
        const size = await evaluateWithRetry(naip.size(), 'NAIP availability check', 1);
        if (!size) return null;

        const mostRecent = naip.sort('system:time_start', false).first();
        // NAIP is natively ~0.6-1m/pixel - bilinear resample smooths the upsampling for small AOIs.
        const vis = mostRecent.resample('bilinear').visualize({ bands: ['R', 'G', 'B'], min: 0, max: 255 });
        const dim = pickThumbDimension(radiusMeters * 2, 1);
        const url = vis.getThumbURL({ dimensions: `${dim}x${dim}`, region: areaOfInterest, format: 'png' });
        return url || null;
    } catch (err) {
        logger.error('naip_thumbnail_failed', { scope: 'ai.flows.compute-metrics', error: redactSensitive(err instanceof Error ? err.message : String(err)) });
        return null;
    }
}

async function runEeAnalysis(input: ComputeMetricsInput): Promise<any> {
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!creds) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set. Please provide service account credentials in your .env file.");
    }
    const privateKey = JSON.parse(creds);
    if (privateKey.private_key) {
        // Fix literal \n strings in the environment variable JSON
        privateKey.private_key = privateKey.private_key.replace(/\\n/g, '\n');
    }

    await authenticate(privateKey);
    await initialize();

    const source = input.satelliteSource ?? 'sentinel2';
    const config = SATELLITE_CONFIGS[source];
    const radiusMeters = input.radiusMeters ?? 100;

    const point = ee.Geometry.Point([input.longitude, input.latitude]);
    const areaOfInterest = point.buffer(radiusMeters); // Tight, field-scale area of interest.

    let collection = config.getCollection(areaOfInterest, input.startDate, input.endDate);
    if (config.cloudProperty) {
        collection = collection.filter(ee.Filter.lt(config.cloudProperty, config.cloudThreshold));
    }

    const size = await evaluateWithRetry(collection.size(), 'size evaluation');
    if (size === 0) {
        throw new Error("No valid satellite imagery found for the selected location, date range, and cloud cover settings. Try expanding the date range, choosing a different satellite source, or increasing the radius.");
    }

    // Map each canonical slot to its native band for this source; slots without a match are skipped.
    const nativeToCanonical: Record<string, string> = {};
    Object.entries(config.bandMap).forEach(([canonical, native]) => {
        if (native) nativeToCanonical[native] = canonical;
    });
    const nativeBands = Object.values(config.bandMap).filter((b): b is string => !!b);

    const applyScale = (image: any) => {
        if (!config.reflectanceScale) return image;
        const { scale, offset } = config.reflectanceScale;
        const optical = image.select(nativeBands).multiply(scale).add(offset);
        return image.addBands(optical, undefined, true);
    };

    const withMetrics = collection.map((rawImage: any) => {
        const image = applyScale(rawImage);
        const ndvi = image.normalizedDifference(config.indexBands.ndvi).rename('NDVI');
        const ndwi = image.normalizedDifference(config.indexBands.ndwi).rename('NDWI');
        const ndbi = image.normalizedDifference(config.indexBands.ndbi).rename('NDBI');
        const nbr = image.normalizedDifference(config.indexBands.nbr).rename('NBR');
        return image.addBands([ndvi, ndwi, ndbi, nbr]).copyProperties(rawImage, ['system:time_start']);
    });

    const chartData = withMetrics.select(['NDVI', 'NDWI', 'NDBI', 'NBR', ...nativeBands]).map((image: any) => {
        const mean = image.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: point,
            scale: config.scale,
            maxPixels: 1e9,
            bestEffort: true,
            tileScale: 4
        });
        const featureProps: any = {
            'system:time_start': image.get('system:time_start'),
            'NDVI': mean.get('NDVI'),
            'NDWI': mean.get('NDWI'),
            'NDBI': mean.get('NDBI'),
            'NBR': mean.get('NBR'),
        };
        nativeBands.forEach(native => {
            featureProps[nativeToCanonical[native]] = mean.get(native);
        });
        return ee.Feature(null, featureProps);
    });

    const firstImage = withMetrics.first();
    const lastImage = withMetrics.sort('system:time_start', false).first();

    // Grid scale for the classification/change-magnitude sample grids: aim for roughly a 20x20
    // grid across the area of interest, but never finer than the source's native pixel size.
    const gridScale = Math.max(config.scale, (radiusMeters * 2) / 20);

    // Real per-pixel land-cover classification grid for the end date, built from the
    // same NDVI/NDWI/NDBI thresholds used for the area stats below (0=other, 1=vegetation,
    // 2=built-up, 3=water) - sampled at a coarse scale so it stays a small, fast payload.
    const classImage = classifyLandCover(lastImage)
        .reproject({ crs: 'EPSG:4326', scale: gridScale });
    const classGridSample = classImage.sampleRectangle({ region: areaOfInterest, defaultValue: 0 });

    // Real per-pixel change magnitude between the start and end images (mean absolute
    // difference across NDVI/NDWI/NDBI), sampled at the same grid - not a synthetic pattern.
    const changeImage = lastImage.select(['NDVI', 'NDWI', 'NDBI'])
        .subtract(firstImage.select(['NDVI', 'NDWI', 'NDBI']))
        .abs()
        .reduce(ee.Reducer.mean())
        .rename('changeMag')
        .reproject({ crs: 'EPSG:4326', scale: gridScale });
    const changeGridSample = changeImage.sampleRectangle({ region: areaOfInterest, defaultValue: 0 });

    // Split into separate evaluate() calls (rather than one combined ee.Dictionary) so a single
    // heavy computation timing out doesn't sink the whole job, and each piece can retry on its own.
    const [timeSeries, landCoverStart, landCoverEnd, regionGeoJSON, classGrid, changeGrid, avgCloudyPct, highResMapUrl] = await Promise.all([
        evaluateWithRetry(chartData.toList(chartData.size()), 'time series evaluation'),
        evaluateWithRetry(calculateLandCoverStats(firstImage, areaOfInterest, config.scale), 'start land cover evaluation'),
        evaluateWithRetry(calculateLandCoverStats(lastImage, areaOfInterest, config.scale), 'end land cover evaluation'),
        evaluateWithRetry(areaOfInterest, 'region geometry evaluation'),
        evaluateWithRetry(classGridSample.get('classId'), 'class grid evaluation'),
        evaluateWithRetry(changeGridSample.get('changeMag'), 'change grid evaluation'),
        config.cloudProperty
            ? evaluateWithRetry(collection.aggregate_mean(config.cloudProperty), 'cloud percentage evaluation')
            : Promise.resolve(null),
        tryGetNaipThumbnail(areaOfInterest, radiusMeters),
    ]);

    if (!timeSeries || !Array.isArray(timeSeries)) throw new Error("No time-series data returned from Earth Engine.");
    if (!landCoverStart || !landCoverEnd) throw new Error("Could not compute land cover analysis. The area might be too small or lack valid imagery at the start/end dates.");
    if (!regionGeoJSON) throw new Error("Could not evaluate the region geometry for map generation.");

    const result: any = { timeSeries, landCoverStart, landCoverEnd, regionGeoJSON, classGrid, changeGrid, avgCloudyPct, satelliteSource: source, radiusMeters };
    if (highResMapUrl) result.highResMapUrl = highResMapUrl;

    const createTrueColorImage = (image: any) => {
        // Bilinear resample instead of GEE's default nearest-neighbor: nearest-neighbor blows
        // each native sensor pixel up into a hard, blocky square once the thumbnail resolution
        // exceeds native resolution (always true for a tight, few-hundred-meter radius).
        return image.resample('bilinear').visualize({
            bands: config.trueColor.bands,
            min: config.trueColor.min,
            max: config.trueColor.max,
            gamma: 1.4
        });
    };

    const beforeVis = createTrueColorImage(firstImage);
    const afterVis = createTrueColorImage(lastImage);

    // Match the requested thumbnail resolution to the source's native pixel size (~2x
    // oversampled for smoothing headroom) instead of always asking for 512x512 - see
    // pickThumbDimension for why that mismatch is what caused the pixelation.
    const mapDim = pickThumbDimension(radiusMeters * 2, config.scale);
    const mapDimensions = `${mapDim}x${mapDim}`;

    result.beforeMapUrl = beforeVis.getThumbURL({ dimensions: mapDimensions, region: result.regionGeoJSON, format: 'png' });
    result.afterMapUrl = afterVis.getThumbURL({ dimensions: mapDimensions, region: result.regionGeoJSON, format: 'png' });

    if (!result.beforeMapUrl || !result.afterMapUrl) throw new Error("Could not generate land cover map URLs.");

    return result;
}

// Shared NDVI/NDWI/NDBI thresholds: single source of truth for what counts as
// vegetation/water/built-up/other, used both for the area stats and the pixel-grid classification.
const classifyLandCover = (image: any) => {
    const ndvi = image.select('NDVI');
    const ndwi = image.select('NDWI');
    const ndbi = image.select('NDBI');

    const water = ndwi.gt(0.0);
    const vegetation = ndvi.gt(0.2).and(water.not());
    const builtUp = ndbi.gt(0.0).and(vegetation.not()).and(water.not());

    // classId: 0 = other, 1 = vegetation, 2 = built-up, 3 = water
    return ee.Image(0)
        .where(vegetation, 1)
        .where(builtUp, 2)
        .where(water, 3)
        .rename('classId')
        .toInt();
};

const calculateLandCoverStats = (image: any, areaOfInterest: any, scale: number) => {
    const ndvi = image.select('NDVI');
    const ndwi = image.select('NDWI');
    const ndbi = image.select('NDBI');

    const water = ndwi.gt(0.0);
    const vegetation = ndvi.gt(0.2).and(water.not());
    const builtUp = ndbi.gt(0.0).and(vegetation.not()).and(water.not());
    const other = water.not().and(vegetation.not()).and(builtUp.not());

    const areaImage = ee.Image.pixelArea().divide(1e6); // to sq km

    const calculateArea = (cover: any) => cover.multiply(areaImage).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: areaOfInterest,
        scale,
        maxPixels: 1e10,
        bestEffort: true,
        tileScale: 4
    }).get(cover.bandNames().get(0));

    return ee.Dictionary({
        vegetation: calculateArea(vegetation),
        water: calculateArea(water),
        builtUp: calculateArea(builtUp),
        other: calculateArea(other),
    });
};


const computeMetricsFlow = async (input: ComputeMetricsInput, jobId: string) => {
  try {
    const [eeData, weatherData, historicalBaseline] = await Promise.all([
        runEeAnalysis(input),
        getHistoricalWeather(input.latitude, input.longitude, input.startDate, input.endDate),
        getHistoricalBaseline(input.latitude, input.longitude)
    ]);
    
    const historicalWeatherResult: HistoricalDataPoint[] = weatherData.daily.time.map((date, index) => ({
        date: date,
        temperature: weatherData.daily.temperature_2m_mean[index],
        precipitation: weatherData.daily.precipitation_sum[index],
    }));

    const allBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'];
    const timeSeriesResult: any = {
        NDVI: [], NDWI: [], NDBI: [], NBR: [],
        ...Object.fromEntries(allBands.map(band => [band, []]))
    };

    eeData.timeSeries.forEach((feature: any) => {
      const date = new Date(feature.properties['system:time_start']).toISOString();
      timeSeriesResult.NDVI.push({ date, value: feature.properties.NDVI ?? null });
      timeSeriesResult.NDWI.push({ date, value: feature.properties.NDWI ?? null });
      timeSeriesResult.NDBI.push({ date, value: feature.properties.NDBI ?? null });
      timeSeriesResult.NBR.push({ date, value: feature.properties.NBR ?? null });
      allBands.forEach(band => {
        // Bands the current satellite source has no native equivalent for simply never appear
        // as feature properties (see nativeToCanonical in runEeAnalysis) - skip them entirely
        // rather than pushing synthetic null points.
        if (band in feature.properties) {
          timeSeriesResult[band].push({ date, value: feature.properties[band] ?? null });
        }
      });
    });

    Object.keys(timeSeriesResult).forEach(key => {
        timeSeriesResult[key].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    });
    
    const start = eeData.landCoverStart;
    const end = eeData.landCoverEnd;
    
    if (!start || !end) {
        throw new Error("Land cover data could not be computed for the start or end of the date range.");
    }
    
    const landCoverAnalysis = {
        vegetation: { startArea: start.vegetation, endArea: end.vegetation, absoluteChange: end.vegetation - start.vegetation, percentageChange: getPercentageChange(start.vegetation, end.vegetation) },
        water: { startArea: start.water, endArea: end.water, absoluteChange: end.water - start.water, percentageChange: getPercentageChange(start.water, end.water) },
        builtUp: { startArea: start.builtUp, endArea: end.builtUp, absoluteChange: end.builtUp - start.builtUp, percentageChange: getPercentageChange(start.builtUp, end.builtUp) },
        other: { startArea: start.other, endArea: end.other, absoluteChange: end.other - start.other, percentageChange: getPercentageChange(start.other, end.other) },
        beforeMapUrl: eeData.beforeMapUrl,
        afterMapUrl: eeData.afterMapUrl,
        ...(eeData.highResMapUrl ? { highResMapUrl: eeData.highResMapUrl } : {}),
    };

    // Prepare data for AI Change Analysis
    const metricsForAI = ['NDVI', 'NDWI', 'NDBI', 'NBR'].map(name => {
        const values: any[] = timeSeriesResult[name];
        if (values.length === 0) return { name, value: null, change: null, trend: 'unknown' as const };
        
        const firstVal = values[0].value;
        const lastVal = values[values.length - 1].value;
        const change = lastVal - firstVal;
        
        let trend: 'increasing' | 'decreasing' | 'stable' | 'unknown' = 'stable';
        if (change > 0.05) trend = 'increasing';
        else if (change < -0.05) trend = 'decreasing';

        return {
            name,
            value: lastVal,
            change,
            trend
        };
    });

    // Run AI Change Analysis
    let changeAnalysisResult: AnalyzeChangeOutput | undefined;
    try {
        changeAnalysisResult = await analyzeChange({
            location: {
                latitude: input.latitude,
                longitude: input.longitude,
                description: historicalBaseline.description
            },
            dateRange: {
                start: input.startDate,
                end: input.endDate
            },
            metrics: metricsForAI,
            historicalContext: `Baseline NDVI: ${historicalBaseline.averageNDVI}, Baseline NDWI: ${historicalBaseline.averageNDWI}.`
        });
    } catch (aiError) {
        console.error("AI Change Analysis Failed:", aiError);
        // We continue without the analysis result, rather than failing the whole job.
    }

    // Real classification grid sampled directly from the same NDVI/NDWI/NDBI thresholds used for
    // landCoverAnalysis above (see classifyLandCover in this file) - no model, no synthetic data.
    const classGrid: number[][] = Array.isArray(eeData.classGrid) ? eeData.classGrid : [];
    const gridHeight = classGrid.length;
    const gridWidth = gridHeight > 0 ? classGrid[0].length : 0;
    const mask = classGrid.flat();

    const CLASS_NAMES = ['other', 'vegetation', 'builtUp', 'water'] as const;
    const classCounts = [0, 0, 0, 0];
    mask.forEach((classId) => {
        if (classId >= 0 && classId < classCounts.length) classCounts[classId]++;
    });
    const totalCells = mask.length || 1;
    const classConfidence = Object.fromEntries(
        CLASS_NAMES.map((name, idx) => [name, classCounts[idx] / totalCells])
    );

    // Confidence here is a real data-quality signal (fraction of the imagery that was cloud-free),
    // not a model score - there is no trained model in this pipeline.
    const avgCloudyPct = typeof eeData.avgCloudyPct === 'number' ? eeData.avgCloudyPct : 100;
    const meanConfidence = Math.min(1, Math.max(0, 1 - avgCloudyPct / 100));

    const segmentationInference = gridWidth > 0 && gridHeight > 0 ? {
        mask,
        width: gridWidth,
        height: gridHeight,
        meanConfidence,
        classConfidence,
        postProcessing: { smoothingKernel: 0, isolatedPixelFixes: 0 },
        model: {
            modelId: 'spectral-threshold-classifier',
            version: 'v1',
            configHash: 'ndvi-gt-0.2_ndwi-gt-0_ndbi-gt-0',
        },
    } : undefined;

    // Real per-pixel change-magnitude grid (mean |NDVI/NDWI/NDBI difference| between the start and
    // end images), normalized 0-1 against its own max so the heatmap has visual contrast.
    const rawChangeGrid: number[][] = Array.isArray(eeData.changeGrid) ? eeData.changeGrid : [];
    const changeHeight = rawChangeGrid.length;
    const changeWidth = changeHeight > 0 ? rawChangeGrid[0].length : 0;
    const flatChange = rawChangeGrid.flat();
    const maxChange = flatChange.reduce((max, v) => Math.max(max, v), 0);
    const changeHeatmap = changeWidth > 0 && changeHeight > 0 ? {
        grid: maxChange > 0 ? flatChange.map((v) => v / maxChange) : flatChange.map(() => 0),
        width: changeWidth,
        height: changeHeight,
    } : undefined;

    const finalResult = {
        satelliteSource: eeData.satelliteSource,
        radiusMeters: eeData.radiusMeters,
        timeSeries: timeSeriesResult,
        landCover: landCoverAnalysis,
        historicalWeather: historicalWeatherResult,
        changeAnalysis: changeAnalysisResult,
        segmentationInference,
        changeHeatmap,
    };
    
    if (memoryJobs.has(jobId)) {
        memoryJobs.set(jobId, { status: 'completed', data: finalResult, completed_at: new Date().toISOString() });
    } else {
        const supabase = getSupabase();
        await supabase.from(JOBS_TABLE).update({
            status: 'completed',
            data: finalResult,
            completed_at: new Date().toISOString()
        }).eq('id', jobId);
    }

  } catch (error: any) {
    console.error(`Error in computeMetricsFlow for job ${jobId}:`, error);
    try {
        if (memoryJobs.has(jobId)) {
            memoryJobs.set(jobId, { status: 'error', error: error.message || 'An unknown error occurred during computation.', failed_at: new Date().toISOString() });
        } else {
            const supabase = getSupabase();
            await supabase.from(JOBS_TABLE).update({
                status: 'error',
                error: error.message || 'An unknown error occurred during computation.',
                failed_at: new Date().toISOString()
            }).eq('id', jobId);
        }
    } catch (dbError) {
        console.error("Critical: Failed to update error status in Supabase:", dbError);
    }
  }
};

