
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

const ComputeMetricsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  startDate: z.string().describe('The start date of the date range (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the date range (YYYY-MM-DD).'),
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
    timeSeries: timeSeriesSchema,
    landCover: z.object({
        vegetation: LandCoverChangeStatSchema,
        water: LandCoverChangeStatSchema,
        builtUp: LandCoverChangeStatSchema,
        other: LandCoverChangeStatSchema,
        beforeMapUrl: z.string().url().describe('A data URI of the land cover map at the start date.'),
        afterMapUrl: z.string().url().describe('A data URI of the land cover map at the end date.'),
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

    const point = ee.Geometry.Point([input.longitude, input.latitude]);
    const areaOfInterest = point.buffer(5000); // 5km buffer around the point

    const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(areaOfInterest)
        .filterDate(input.startDate, input.endDate)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 75));

    const size = await evaluateWithRetry(collection.size(), 'size evaluation');
    if (size === 0) {
        throw new Error("No valid satellite imagery found for the selected location, date range, and cloud cover settings. Try expanding the date range or choosing a different area.");
    }

    const allBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'];

    const withMetrics = collection.map((image: any) => {
        const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
        const ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
        const ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
        const nbr = image.normalizedDifference(['B8A', 'B12']).rename('NBR');
        return image.addBands([ndvi, ndwi, ndbi, nbr]);
    });

    const chartData = withMetrics.select(['NDVI', 'NDWI', 'NDBI', 'NBR', ...allBands]).map((image: any) => {
        const mean = image.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: point,
            scale: 10,
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
        allBands.forEach(band => {
            featureProps[band] = mean.get(band);
        });
        return ee.Feature(null, featureProps);
    });

    const firstImage = withMetrics.first();
    const lastImage = withMetrics.sort('system:time_start', false).first();

    // Real per-pixel land-cover classification grid for the end date, built from the
    // same NDVI/NDWI/NDBI thresholds used for the area stats below (0=other, 1=vegetation,
    // 2=built-up, 3=water) - sampled at a coarse scale so it stays a small, fast payload.
    const classImage = classifyLandCover(lastImage)
        .reproject({ crs: 'EPSG:4326', scale: 200 });
    const classGridSample = classImage.sampleRectangle({ region: areaOfInterest, defaultValue: 0 });

    // Real per-pixel change magnitude between the start and end images (mean absolute
    // difference across NDVI/NDWI/NDBI), sampled at the same grid - not a synthetic pattern.
    const changeImage = lastImage.select(['NDVI', 'NDWI', 'NDBI'])
        .subtract(firstImage.select(['NDVI', 'NDWI', 'NDBI']))
        .abs()
        .reduce(ee.Reducer.mean())
        .rename('changeMag')
        .reproject({ crs: 'EPSG:4326', scale: 200 });
    const changeGridSample = changeImage.sampleRectangle({ region: areaOfInterest, defaultValue: 0 });

    // Split into separate evaluate() calls (rather than one combined ee.Dictionary) so a single
    // heavy computation timing out doesn't sink the whole job, and each piece can retry on its own.
    const [timeSeries, landCoverStart, landCoverEnd, regionGeoJSON, classGrid, changeGrid, avgCloudyPct] = await Promise.all([
        evaluateWithRetry(chartData.toList(chartData.size()), 'time series evaluation'),
        evaluateWithRetry(calculateLandCoverStats(firstImage, areaOfInterest), 'start land cover evaluation'),
        evaluateWithRetry(calculateLandCoverStats(lastImage, areaOfInterest), 'end land cover evaluation'),
        evaluateWithRetry(areaOfInterest, 'region geometry evaluation'),
        evaluateWithRetry(classGridSample.get('classId'), 'class grid evaluation'),
        evaluateWithRetry(changeGridSample.get('changeMag'), 'change grid evaluation'),
        evaluateWithRetry(collection.aggregate_mean('CLOUDY_PIXEL_PERCENTAGE'), 'cloud percentage evaluation'),
    ]);

    if (!timeSeries || !Array.isArray(timeSeries)) throw new Error("No time-series data returned from Earth Engine.");
    if (!landCoverStart || !landCoverEnd) throw new Error("Could not compute land cover analysis. The area might be too small or lack valid imagery at the start/end dates.");
    if (!regionGeoJSON) throw new Error("Could not evaluate the region geometry for map generation.");

    const result: any = { timeSeries, landCoverStart, landCoverEnd, regionGeoJSON, classGrid, changeGrid, avgCloudyPct };

    const createTrueColorImage = (image: any) => {
        return image.visualize({
            bands: ['B4', 'B3', 'B2'],
            min: 0,
            max: 3000,
            gamma: 1.4
        });
    };

    const beforeVis = createTrueColorImage(firstImage);
    const afterVis = createTrueColorImage(lastImage);

    result.beforeMapUrl = beforeVis.getThumbURL({ dimensions: '512x512', region: result.regionGeoJSON, format: 'png' });
    result.afterMapUrl = afterVis.getThumbURL({ dimensions: '512x512', region: result.regionGeoJSON, format: 'png' });

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

const calculateLandCoverStats = (image: any, areaOfInterest: any) => {
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
        scale: 30,
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
      timeSeriesResult.NDVI.push({ date, value: feature.properties.NDVI });
      timeSeriesResult.NDWI.push({ date, value: feature.properties.NDWI });
      timeSeriesResult.NDBI.push({ date, value: feature.properties.NDBI });
      timeSeriesResult.NBR.push({ date, value: feature.properties.NBR });
      allBands.forEach(band => {
        timeSeriesResult[band].push({ date, value: feature.properties[band] });
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
        afterMapUrl: eeData.afterMapUrl
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

