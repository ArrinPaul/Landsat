
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

            // First, evaluate the size of the collection. This is the critical step.
            collection.size().evaluate((size, error) => {
                if (error) {
                    return reject(new Error(`Earth Engine Error during size evaluation: ${error}`));
                }
                if (size === 0) {
                    // If there are no images, reject the promise immediately with a user-friendly error.
                    return reject(new Error("No valid satellite imagery found for the selected location, date range, and cloud cover settings. Try expanding the date range or choosing a different area."));
                }
                
                const allBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'];

                // If we have images, proceed with the full analysis.
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

                // Land cover analysis
                const firstImage = withMetrics.first();
                const lastImage = withMetrics.sort('system:time_start', false).first();
                
                const landCoverPalette = [
                    '666666', // Other (gray)
                    '00FF00', // Vegetation (green)
                    'FF0000', // Built-up (red)
                    '0000FF', // Water (blue)
                ];

                const createClassifiedImage = (image: ee.Image) => {
                    const ndvi = image.select('NDVI');
                    const ndwi = image.select('NDWI');
                    const ndbi = image.select('NDBI');

                    const water = ndwi.gt(0.0).rename('water');
                    const vegetation = ndvi.gt(0.2).and(water.not()).rename('vegetation');
                    const builtUp = ndbi.gt(0.0).and(vegetation.not()).and(water.not()).rename('builtUp');
                    
                    // Create a single-band image where pixel values represent classes
                    // 0=Other, 1=Vegetation, 2=Built-up, 3=Water
                    const classified = ee.Image(0)
                        .where(vegetation, 1)
                        .where(builtUp, 2)
                        .where(water, 3)
                        .rename('landcover');
                        
                    return classified.visualize({
                        min: 0,
                        max: 3,
                        palette: landCoverPalette
                    });
                };
                
                const calculateLandCoverStats = (image: ee.Image) => {
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
                
                const landCoverStart = calculateLandCoverStats(firstImage);
                const landCoverEnd = calculateLandCoverStats(lastImage);

                const getMapUri = (image: ee.Image) => {
                    const classifiedVis = createClassifiedImage(image);
                    return classifiedVis.getThumbURL({
                        dimensions: '512x512',
                        region: areaOfInterest.toGeoJSON(),
                        format: 'png'
                    });
                };
                
                const beforeMapUrl = getMapUri(firstImage);
                const afterMapUrl = getMapUri(lastImage);


                // Now evaluate the full results.
                ee.Dictionary({
                    timeSeries: chartData.toList(chartData.size()),
                    landCoverStart: landCoverStart,
                    landCoverEnd: landCoverEnd,
                    beforeMapUrl: beforeMapUrl,
                    afterMapUrl: afterMapUrl
                }).evaluate((result, error) => {
                    if (error) {
                        return reject(new Error(`Earth Engine Error during final evaluation: ${error}`));
                    }
                    // Add more robust checks for the final result object.
                    if (!result || !result.timeSeries || !Array.isArray(result.timeSeries)) {
                        return reject(new Error("No time-series data returned from Earth Engine."));
                    }
                     if (!result.landCoverStart || !result.landCoverEnd) {
                        return reject(new Error("Could not compute land cover analysis. The area might be too small or lack valid imagery at the start/end dates."));
                    }
                    if (!result.beforeMapUrl || !result.afterMapUrl) {
                        return reject(new Error("Could not generate land cover maps."));
                    }
                    resolve(result);
                });
            });

        } catch (e) {
            console.error('Error during Earth Engine processing setup:', e);
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
    const eeData = await runEeAnalysis(input);

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
        },
        beforeMapUrl: eeData.beforeMapUrl,
        afterMapUrl: eeData.afterMapUrl
    };

    return { 
        timeSeries: timeSeriesResult,
        landCover: landCoverAnalysis,
     };
  }
);

    