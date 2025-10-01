
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


// In-memory store for job results. In a production system, use a database like Firestore or Redis.
const jobResults = new Map<string, { status: 'pending' | 'completed' | 'error', data?: any, error?: string }>();

// Helper function to calculate percentage change
function getPercentageChange(start: number, end: number): number {
    if (start === 0) {
        return end > 0 ? 100.0 : 0.0;
    }
    return ((end - start) / Math.abs(start)) * 100;
}

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
  jobResults.set(jobId, { status: 'pending' });

  // Do not await this. Let it run in the background.
  computeMetricsFlow(input, jobId);

  return { jobId };
}

// This function retrieves the result of a computation.
export async function getMetricsResult(jobId: string): Promise<JobResultOutput> {
    const job = jobResults.get(jobId);

    if (!job) {
        return { status: 'error', error: 'Job not found.' };
    }

    if (job.status === 'completed') {
        return { status: 'completed', result: job.data };
    }

    if (job.status === 'error') {
        return { status: 'error', error: job.error };
    }
    
    return { status: 'pending' };
}


// Promisify the ee.data.authenticateViaPrivateKey and ee.initialize functions
const authenticate = (key: any) => new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(key, () => resolve(), (err: string) => reject(new Error(err)));
});

const initialize = () => new Promise<void>((resolve, reject) => {
    ee.initialize(null, null, () => resolve(), (err: string) => reject(new Error(err)));
});

async function runEeAnalysis(input: ComputeMetricsInput): Promise<any> {
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!creds) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set. Please provide service account credentials in your .env file.");
    }
    const privateKey = JSON.parse(creds);

    await authenticate(privateKey);
    await initialize();

    return new Promise((resolve, reject) => {
        try {
            const point = ee.Geometry.Point([input.longitude, input.latitude]);
            const areaOfInterest = point.buffer(5000); // 5km buffer around the point

            const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(areaOfInterest)
                .filterDate(input.startDate, input.endDate)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 75));
            
            collection.size().evaluate((size, error) => {
                if (error) {
                    return reject(new Error(`Earth Engine Error during size evaluation: ${error}`));
                }
                if (size === 0) {
                    return reject(new Error("No valid satellite imagery found for the selected location, date range, and cloud cover settings. Try expanding the date range or choosing a different area."));
                }
                
                const allBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'];

                const withMetrics = collection.map(image => {
                    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
                    const ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
                    const ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
                    const nbr = image.normalizedDifference(['B8A', 'B12']).rename('NBR');
                    return image.addBands([ndvi, ndwi, ndbi, nbr]);
                });

                const chartData = withMetrics.select(['NDVI', 'NDWI', 'NDBI', 'NBR', ...allBands]).map(image => {
                    const mean = image.reduceRegion({
                        reducer: ee.Reducer.mean(),
                        geometry: point,
                        scale: 10,
                        maxPixels: 1e9
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

                const evaluateAll = ee.Dictionary({
                    timeSeries: chartData.toList(chartData.size()),
                    landCoverStart: calculateLandCoverStats(firstImage, areaOfInterest),
                    landCoverEnd: calculateLandCoverStats(lastImage, areaOfInterest),
                    regionGeoJSON: areaOfInterest,
                });

                evaluateAll.evaluate((result: any, error) => {
                    if (error) return reject(new Error(`Earth Engine Error during final evaluation: ${error}`));
                    if (!result || !result.timeSeries || !Array.isArray(result.timeSeries)) return reject(new Error("No time-series data returned from Earth Engine."));
                    if (!result.landCoverStart || !result.landCoverEnd) return reject(new Error("Could not compute land cover analysis. The area might be too small or lack valid imagery at the start/end dates."));
                    if (!result.regionGeoJSON) return reject(new Error("Could not evaluate the region geometry for map generation."));

                    const landCoverPalette = ['666666', '00FF00', 'FF0000', '0000FF'];
                    const createClassifiedImage = (image: ee.Image) => {
                        return ee.Image(0).where(image.select('NDWI').gt(0.0), 3).where(image.select('NDVI').gt(0.2).and(image.select('NDWI').lte(0.0)), 1).where(image.select('NDBI').gt(0.0).and(image.select('NDVI').lte(0.2)).and(image.select('NDWI').lte(0.0)), 2).rename('landcover').visualize({min: 0, max: 3, palette: landCoverPalette});
                    };

                    const beforeVis = createClassifiedImage(firstImage);
                    const afterVis = createClassifiedImage(lastImage);
                    
                    result.beforeMapUrl = beforeVis.getThumbURL({ dimensions: '512x512', region: result.regionGeoJSON, format: 'png' });
                    result.afterMapUrl = afterVis.getThumbURL({ dimensions: '512x512', region: result.regionGeoJSON, format: 'png' });

                    if (!result.beforeMapUrl || !result.afterMapUrl) return reject(new Error("Could not generate land cover map URLs."));
                    
                    resolve(result);
                });
            });

        } catch (e) {
            console.error('Error during Earth Engine processing setup:', e);
            reject(e);
        }
    });
}

const calculateLandCoverStats = (image: ee.Image, areaOfInterest: ee.Geometry) => {
    const ndvi = image.select('NDVI');
    const ndwi = image.select('NDWI');
    const ndbi = image.select('NDBI');

    const water = ndwi.gt(0.0);
    const vegetation = ndvi.gt(0.2).and(water.not());
    const builtUp = ndbi.gt(0.0).and(vegetation.not()).and(water.not());
    const other = water.not().and(vegetation.not()).and(builtUp.not());

    const areaImage = ee.Image.pixelArea().divide(1e6); // to sq km

    const calculateArea = (cover: ee.Image) => cover.multiply(areaImage).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: areaOfInterest,
        scale: 30,
        maxPixels: 1e10
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
    const [eeData, weatherData] = await Promise.all([
        runEeAnalysis(input),
        getHistoricalWeather(input.latitude, input.longitude, input.startDate, input.endDate)
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

    const finalResult = { 
        timeSeries: timeSeriesResult,
        landCover: landCoverAnalysis,
        historicalWeather: historicalWeatherResult,
    };
    
    jobResults.set(jobId, { status: 'completed', data: finalResult });

  } catch (error: any) {
    console.error(`Error in computeMetricsFlow for job ${jobId}:`, error);
    jobResults.set(jobId, { status: 'error', error: error.message || 'An unknown error occurred during computation.' });
  }
};

    