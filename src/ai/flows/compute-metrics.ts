
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

const DataPointSchema = z.object({
  date: z.string(),
  value: z.number().nullable(),
});

const ComputeMetricsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  startDate: z.string().describe('The start date of the date range (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the date range (YYYY-MM-DD).'),
});
export type ComputeMetricsInput = z.infer<typeof ComputeMetricsInputSchema>;

const ComputeMetricsOutputSchema = z.object({
    NDVI: z.array(DataPointSchema).describe('The computed time-series data for NDVI.'),
    NDWI: z.array(DataPointSchema).describe('The computed time-series data for NDWI.'),
    NDBI: z.array(DataPointSchema).describe('The computed time-series data for NDBI.'),
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
    console.log('Authenticating with Earth Engine...');
    const privateKey = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
    await authenticate(privateKey);
    console.log('Earth Engine Authenticated.');
    
    console.log('Initializing Earth Engine...');
    await initialize();
    console.log('Earth Engine Initialized.');

    return new Promise((resolve, reject) => {
        try {
            const point = ee.Geometry.Point([input.longitude, input.latitude]);
            const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(point)
                .filterDate(input.startDate, input.endDate)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

            const withMetrics = collection.map(image => {
                const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
                const ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
                const ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
                return image.addBands([ndvi, ndwi, ndbi]);
            });
            
            const reducer = ee.Reducer.mean();

            const chartData = withMetrics.select(['NDVI', 'NDWI', 'NDBI']).map(image => {
                const mean = image.reduceRegion({
                    reducer: reducer,
                    geometry: point,
                    scale: 10,
                    maxPixels: 1e9
                });
                return ee.Feature(null, {
                    'system:time_start': image.get('system:time_start'),
                    'NDVI': mean.get('NDVI'),
                    'NDWI': mean.get('NDWI'),
                    'NDBI': mean.get('NDBI'),
                });
            });
            
            console.log('Evaluating chart data...');
            chartData.evaluate((data: any, error: any) => {
                if (error) {
                    console.error('Earth Engine Error:', error);
                    reject(new Error(`Earth Engine Error: ${error}`));
                } else {
                    console.log('Earth Engine evaluation successful.');
                    resolve(data);
                }
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

    if (!eeData || !eeData.features) {
      throw new Error('No data returned from Earth Engine.');
    }

    const ndviSeries: z.infer<typeof DataPointSchema>[] = [];
    const ndwiSeries: z.infer<typeof DataPointSchema>[] = [];
    const ndbiSeries: z.infer<typeof DataPointSchema>[] = [];

    eeData.features.forEach((feature: any) => {
      const date = new Date(feature.properties['system:time_start']).toISOString();
      ndviSeries.push({ date, value: feature.properties.NDVI });
      ndwiSeries.push({ date, value: feature.properties.NDWI });
      ndbiSeries.push({ date, value: feature.properties.NDBI });
    });

    return { 
        NDVI: ndviSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        NDWI: ndwiSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        NDBI: ndbiSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
     };
  }
);
