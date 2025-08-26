
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
import { a, b } from '@google/earthengine/build/seald-classes';

const DataPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

const ComputeMetricsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  startDate: z.string().describe('The start date of the date range (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the date range (YYYY-MM-DD).'),
});
export type ComputeMetricsInput = z.infer<typeof ComputeMetricsInputSchema>;

const ComputeMetricsOutputSchema = z.object({
    timeSeries: z.array(DataPointSchema).describe('The computed time-series data for the metric.'),
});
export type ComputeMetricsOutput = z.infer<typeof ComputeMetricsOutputSchema>;

// This function needs to be an exported async function
export async function computeMetrics(input: ComputeMetricsInput): Promise<ComputeMetricsOutput> {
    return computeMetricsFlow(input);
}


async function runEeAnalysis(input: ComputeMetricsInput): Promise<any> {
    return new Promise((resolve, reject) => {
        ee.initialize(null, null, () => {
            try {
                const point = ee.Geometry.Point([input.longitude, input.latitude]);
                const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(point)
                    .filterDate(input.startDate, input.endDate)
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

                const withNdvi = collection.map(image => {
                    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
                    return image.addBands(ndvi);
                });

                const chartData = withNdvi.select('NDVI').map(image => {
                    const mean = image.reduceRegion({
                        reducer: ee.Reducer.mean(),
                        geometry: point,
                        scale: 10,
                    });
                    return ee.Feature(null, {
                        'system:time_start': image.get('system:time_start'),
                        'NDVI': mean.get('NDVI')
                    });
                });

                chartData.evaluate((data: any, error: any) => {
                    if (error) {
                        reject(new Error(`Earth Engine Error: ${error}`));
                    } else {
                        resolve(data);
                    }
                });

            } catch (e) {
                reject(e);
            }
        }, (err: any) => {
            reject(new Error(`Earth Engine initialization failed: ${err}`));
        });
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

    const timeSeries = eeData.features.map((feature: any) => ({
      date: new Date(feature.properties['system:time_start']).toISOString(),
      value: feature.properties.NDVI,
    })).filter((d: any) => d.value !== null);

    return { timeSeries };
  }
);
