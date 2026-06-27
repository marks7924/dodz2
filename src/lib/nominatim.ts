import { createClient } from '@/lib/supabase/client';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const APP_USER_AGENT = 'DodzFriedChicken/1.0 (delivery@dodz.com)';

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

// Cache to avoid hammering Nominatim
const reverseCache = new Map<string, string>();
const searchCache = new Map<string, NominatimResult[]>();

/**
 * Converts lat/lng coordinates to a readable address string via Nominatim reverse geocoding.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseCache.has(key)) return reverseCache.get(key)!;

  try {
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar,en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT },
    });
    if (!res.ok) throw new Error('Nominatim reverse failed');
    const data = await res.json();
    const address = data.display_name as string;
    reverseCache.set(key, address);
    return address;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/**
 * Searches for addresses matching a query string via Nominatim.
 */
export async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query.trim() || query.trim().length < 3) return [];
  const key = query.trim().toLowerCase();
  if (searchCache.has(key)) return searchCache.get(key)!;

  try {
    const encoded = encodeURIComponent(query);
    // Bias results to Egypt (Cairo area) with countrycodes=eg
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encoded}&countrycodes=eg&limit=6&addressdetails=1&accept-language=ar,en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT },
    });
    if (!res.ok) throw new Error('Nominatim search failed');
    const results = await res.json() as NominatimResult[];
    searchCache.set(key, results);
    return results;
  } catch {
    return [];
  }
}
