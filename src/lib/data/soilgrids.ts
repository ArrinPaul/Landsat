import { cacheKey, withCache, type DataCacheStore } from '@/lib/data/cache';
import { fetchJson } from '@/lib/data/http';
import { isAvailable, measured, unavailable, type Measured } from '@/lib/data/measured';

const SOILGRIDS_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const SOURCE = 'ISRIC SoilGrids 0-5 cm';
const NINETY_DAYS_S = 90 * 24 * 60 * 60;
/** Modelled 250 m product, not an in-field measurement. */
const SOILGRIDS_QUALITY = 0.75;

export interface SoilTexture {
  texture: string;
  sandPct: number;
  siltPct: number;
  clayPct: number;
  phH2o: number | null;
  organicCarbonGkg: number | null;
}

/** USDA soil texture class from percent sand, silt and clay. */
export function classifyUsdaTexture(sand: number, silt: number, clay: number): string {
  if (silt + 1.5 * clay < 15) return 'Sand';
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return 'Loamy sand';
  if (
    (clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) ||
    (clay < 7 && silt < 50 && silt + 2 * clay >= 30)
  ) {
    return 'Sandy loam';
  }
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'Silt loam';
  if (silt >= 80 && clay < 12) return 'Silt';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'Sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 35 && sand > 45) return 'Sandy clay';
  if (clay >= 40 && silt >= 40) return 'Silty clay';
  if (clay >= 40 && sand <= 45 && silt < 40) return 'Clay';
  return 'Unclassified';
}

interface RawLayer {
  name?: string;
  unit_measure?: { d_factor?: number };
  depths?: Array<{ values?: { mean?: number | null } }>;
}

export function parseSoilGrids(body: unknown): SoilTexture | null {
  const layers = (body as { properties?: { layers?: RawLayer[] } } | null)?.properties?.layers;
  if (!Array.isArray(layers)) return null;

  const read = (name: string): number | null => {
    const layer = layers.find((l) => l.name === name);
    const mean = layer?.depths?.[0]?.values?.mean;
    if (typeof mean !== 'number' || !Number.isFinite(mean)) return null;
    const factor = layer?.unit_measure?.d_factor;
    return mean / (typeof factor === 'number' && factor > 0 ? factor : 1);
  };

  const sand = read('sand');
  const silt = read('silt');
  const clay = read('clay');
  if (sand === null || silt === null || clay === null) return null;

  return {
    texture: classifyUsdaTexture(sand, silt, clay),
    sandPct: sand,
    siltPct: silt,
    clayPct: clay,
    phH2o: read('phh2o'),
    organicCarbonGkg: read('soc'),
  };
}

/**
 * Real topsoil texture, pH and organic carbon from ISRIC SoilGrids. Cached for
 * 90 days (soil does not change). Never throws; failures are `unavailable`.
 */
export async function getSoilTexture(
  latitude: number,
  longitude: number,
  store?: DataCacheStore,
): Promise<Measured<SoilTexture>> {
  const params = new URLSearchParams({ lon: String(longitude), lat: String(latitude), depth: '0-5cm', value: 'mean' });
  for (const property of ['clay', 'sand', 'silt', 'phh2o', 'soc']) params.append('property', property);

  try {
    const soil = await withCache<SoilTexture | null>(
      cacheKey('soilgrids', latitude, longitude),
      NINETY_DAYS_S,
      async () =>
        parseSoilGrids(
          await fetchJson<unknown>(`${SOILGRIDS_URL}?${params.toString()}`, {
            provider: 'soilgrids',
            endpoint: 'properties_query',
            timeoutMs: 20_000,
            retries: 1,
          }),
        ),
      store,
    );
    if (soil === null) {
      return unavailable({
        unit: 'USDA texture class',
        source: SOURCE,
        reason: 'SoilGrids has no soil data for this point (water, urban or ice)',
      });
    }
    return measured(soil, { unit: 'USDA texture class', source: SOURCE, quality: SOILGRIDS_QUALITY });
  } catch (error: unknown) {
    return unavailable({
      unit: 'USDA texture class',
      source: SOURCE,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/** One line for prompts and summaries. */
export function describeSoilTexture(m: Measured<SoilTexture>): string {
  if (!isAvailable(m)) return 'Unknown (soil data unavailable)';
  const s = m.value;
  const extras = [
    `clay ${s.clayPct.toFixed(0)}%`,
    `sand ${s.sandPct.toFixed(0)}%`,
    `silt ${s.siltPct.toFixed(0)}%`,
    s.phH2o !== null ? `pH ${s.phH2o.toFixed(1)}` : null,
    s.organicCarbonGkg !== null ? `organic carbon ${s.organicCarbonGkg.toFixed(1)} g/kg` : null,
  ].filter(Boolean);
  return `${s.texture} (${extras.join(', ')}; ${m.source})`;
}

export async function describeSoil(latitude: number, longitude: number): Promise<string> {
  return describeSoilTexture(await getSoilTexture(latitude, longitude));
}
