
'use server';
/**
 * @fileOverview A flow for computing environmental metrics using Google Earth Engine.
 * - computeMetrics - A function that computes metrics for a given location and date range.
 * - ComputeMetricsInput - The input type for the computeMetrics function.
 * - ComputeMetricsOutput - The return type for the computeMetrics function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import ee from '@google/earthengine';

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

const ComputeMetricsOutputSchema = z.object({
    timeSeries: z.object({
        NDVI: z.array(DataPointSchema).describe('The computed time-series data for NDVI.'),
        NDWI: z.array(DataPointSchema).describe('The computed time-series data for NDWI.'),
        NDBI: z.array(DataPointSchema).describe('The computed time-series data for NDBI.'),
        NBR: z.array(DataPointSchema).describe('The computed time-series data for NBR.'),
    }),
    landCover: z.object({
        vegetation: LandCoverChangeStatSchema,
        water: LandCoverChangeStatSchema,
        builtUp: LandCoverChangeStatSchema,
        other: LandCoverChangeStatSchema,
    }),
});
export type ComputeMetricsOutput = z.infer<typeof ComputeMetricsOutputSchema>;

// This function needs to be an exported async function
export async function computeMetrics(input: ComputeMetricsInput): Promise<ComputeMetricsOutput> {
    return computeMetricsFlow(input);
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

    console.log('Authenticating with Earth Engine...');
    await authenticate(privateKey);
    console.log('Earth Engine Authenticated.');
    
    console.log('Initializing Earth Engine...');
    await initialize();
    console.log('Earth Engine Initialized.');

    return new Promise((resolve, reject) => {
        try {
            const point = ee.Geometry.Point([input.longitude, input.latitude]);
            const areaOfInterest = point.buffer(5000); // 5km buffer around the point

            const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(areaOfInterest)
                .filterDate(input.startDate, input.endDate)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

            collection.size().evaluate((size, error) => {
                if (error) return reject(new Error(`Earth Engine Error: ${error}`));
                if (size === 0) {
                    return reject(new Error("No valid satellite imagery found for the selected location, date range, and cloud cover settings. Try expanding the date range or choosing a different area."));
                }
                
                // Time-series analysis
                const withMetrics = collection.map(image => {
                    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
                    const ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
                    const ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
                    const nbr = image.normalizedDifference(['B8A', 'B12']).rename('NBR');
                    return image.addBands([ndvi, ndwi, ndbi, nbr]);
                });

                const chartData = withMetrics.select(['NDVI', 'NDWI', 'NDBI', 'NBR']).map(image => {
                    const mean = image.reduceRegion({
                        reducer: ee.Reducer.mean(),
                        geometry: point,
                        scale: 10,
                        maxPixels: 1e9
                    });
                    return ee.Feature(null, {
                        'system:time_start': image.get('system:time_start'),
                        'NDVI': mean.get('NDVI'),
                        'NDWI': mean.get('NDWI'),
                        'NDBI': mean.get('NDBI'),
                        'NBR': mean.get('NBR'),
                    });
                });

                // Land cover analysis
                const firstImage = withMetrics.first();
                const lastImage = withMetrics.sort('system:time_start', false).first();
                
                const calculateLandCover = (image: ee.Image) => {
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
                
                const landCoverStart = calculateLandCover(firstImage);
                const landCoverEnd = calculateLandCover(lastImage);

                ee.Dictionary({
                    timeSeries: chartData,
                    landCoverStart: landCoverStart,
                    landCoverEnd: landCoverEnd
                }).evaluate((result, error) => {
                    if (error) {
                        return reject(new Error(`Earth Engine Error: ${error}`));
                    }
                    if (!result || !result.timeSeries || !result.timeSeries.features) {
                        return reject(new Error("No time-series data returned from Earth Engine."));
                    }
                     if (!result.landCoverStart || !result.landCoverEnd) {
                        return reject(new Error("Could not compute land cover analysis. The area might be too small or lack valid imagery at the start/end dates."));
                    }
                    resolve(result);
                });
            });

        } catch (e) {
            console.error('Error during Earth Engine processing:', e);
            reject(e);
        }
    });
}


const computeMetricsFlow = ai.defineFlow(
  {
    name: 'computeMetricsFlow',
    inputSchema: ComputeMetricsInputSchema,
    outputSchema: ComputeMetricsOutputSchema,
  },
  async (input) => {
    console.log('Starting Earth Engine analysis...');
    const eeData = await runEeAnalysis(input);
    console.log('Earth Engine analysis complete.');

    const ndviSeries: z.infer<typeof DataPointSchema>[] = [];
    const ndwiSeries: z.infer<typeof DataPointSchema>[] = [];
    const ndbiSeries: z.infer<typeof DataPointSchema>[] = [];
    const nbrSeries: z.infer<typeof DataPointSchema>[] = [];

    eeData.timeSeries.features.forEach((feature: any) => {
      const date = new Date(feature.properties['system:time_start']).toISOString();
      ndviSeries.push({ date, value: feature.properties.NDVI });
      ndwiSeries.push({ date, value: feature.properties.NDWI });
      ndbiSeries.push({ date, value: feature.properties.NDBI });
      nbrSeries.push({ date, value: feature.properties.NBR });
    });
    
    const start = eeData.landCoverStart;
    const end = eeData.landCoverEnd;
    
    const landCoverAnalysis = {
        vegetation: {
            startArea: start.vegetation,
            endArea: end.vegetation,
            absoluteChange: end.vegetation - start.vegetation,
            percentageChange: getPercentageChange(start.vegetation, end.vegetation),
        },
        water: {
            startArea: start.water,
            endArea: end.water,
            absoluteChange: end.water - start.water,
            percentageChange: getPercentageChange(start.water, end.water),
        },
        builtUp: {
            startArea: start.builtUp,
            endArea: end.builtUp,
            absoluteChange: end.builtUp - start.builtUp,
            percentageChange: getPercentageChange(start.builtUp, end.builtUp),
        },
        other: {
            startArea: start.other,
            endArea: end.other,
            absoluteChange: end.other - start.other,
            percentageChange: getPercentageChange(start.other, end.other),
        }
    };

    return { 
        timeSeries: {
            NDVI: ndviSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            NDWI: ndwiSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            NDBI: ndbiSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            NBR: nbrSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        },
        landCover: landCoverAnalysis,
     };
  }
);
