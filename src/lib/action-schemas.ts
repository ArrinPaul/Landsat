import { z } from 'zod';

export const CoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SatelliteSourceSchema = z.enum(['sentinel2', 'landsat', 'modis']);
export type SatelliteSource = z.infer<typeof SatelliteSourceSchema>;

// [longitude, latitude] pair, matching GeoJSON coordinate order.
export const LngLatSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);

// A closed polygon ring: at least 4 points (3 distinct vertices + closing point).
export const PolygonRingSchema = z.array(LngLatSchema).min(4);

export const ComputeMetricsInputActionSchema = CoordinatesSchema.extend({
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  // Radius of the area of interest around the point, in meters. Small values (tens to a few
  // hundred meters) keep the analysis and map imagery scoped to a specific field/parcel instead
  // of an entire city. Ignored when `polygon` is provided.
  radiusMeters: z.number().finite().min(10).max(2000).default(100),
  satelliteSource: SatelliteSourceSchema.default('sentinel2'),
  // A user-drawn boundary. When present, this replaces the radius-based circle as the area of
  // interest; `latitude`/`longitude` are still used as the centroid for point-based lookups
  // (weather, satellite pass) elsewhere.
  polygon: PolygonRingSchema.optional(),
});

export const GeocodeActionSchema = z.object({
  query: z.string().min(2).max(200),
});

export const ChatbotMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const ChatbotInputActionSchema = z.object({
  messages: z.array(ChatbotMessageSchema),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const SuggestCoordinatesActionSchema = z.object({
  locationDescription: z.string().min(2).max(400),
});

export const GenerateReportActionSchema = z.object({
  metricsData: z.string().min(1),
  location: z.string().min(1),
  dateRange: z.string().min(1),
});

export const TextToSpeechActionSchema = z.object({
  text: z.string().min(1).max(6000),
});

export const PredictCropYieldActionSchema = CoordinatesSchema.extend({
  cropType: z.string().default('Maize'),
});

export const ScenarioAnalysisActionSchema = CoordinatesSchema.extend({
  scenarioDescription: z.string().min(3).max(1200),
});

export const AdvancedCropAdviceActionSchema = z.object({
  crop: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  climateDescription: z.string(),
  language: z.string().default('en'),
});

export const TimelapseVideoActionSchema = z.object({
  metricName: z.string().min(1),
  locationDescription: z.string().min(1),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
});

export const SuggestCropActionSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  climateDescription: z.string(),
  currentCrop: z.string().optional(),
  language: z.string().default('en'),
});
