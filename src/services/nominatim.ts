
/**
 * @fileOverview A service to geocode place names using OpenStreetMap's free Nominatim API.
 */
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/security';
import { logSystemMetric } from '@/lib/metrics';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  // [south, north, west, east]
  boundingBox: [number, number, number, number];
}

interface NominatimResponseItem {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
}

/**
 * Resolves a free-text place name (e.g. "Austin, Texas") to candidate locations.
 * @param query The place name to search for.
 * @returns Up to 5 matching locations, ranked by Nominatim's relevance.
 */
export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '0',
  });
  const url = `${NOMINATIM_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        // Required by Nominatim's usage policy: identify the application making requests.
        'User-Agent': 'EarthInsights/1.0 (satellite analytics dashboard)',
        'Accept-Language': 'en',
      },
    });
    if (!response.ok) {
      throw new Error(`Nominatim API returned an error: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as NominatimResponseItem[];

    logSystemMetric({ metric_type: 'api_call', provider: 'nominatim', is_success: true, metadata: { endpoint: 'search' } });

    return data.map((item) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      boundingBox: [
        parseFloat(item.boundingbox[0]),
        parseFloat(item.boundingbox[1]),
        parseFloat(item.boundingbox[2]),
        parseFloat(item.boundingbox[3]),
      ],
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('geocode_fetch_failed', {
      scope: 'services.nominatim',
      error: redactSensitive(message),
    });
    logSystemMetric({ metric_type: 'api_call', provider: 'nominatim', is_success: false, error_message: message, metadata: { endpoint: 'search' } });
    throw new Error('Could not search for that location. Please try again or enter coordinates manually.');
  }
}
