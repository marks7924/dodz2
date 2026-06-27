const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteResult {
  distance: number;     // km
  duration: number;     // minutes
  polyline: [number, number][];  // [lat, lng] pairs
}

// Simple cache keyed by "fromLat,fromLng→toLat,toLng"
const routeCache = new Map<string, RouteResult>();

/**
 * Fetches driving route, distance and ETA between two coordinates using OSRM.
 */
export async function getRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  const key = `${fromLat.toFixed(4)},${fromLng.toFixed(4)}->${toLat.toFixed(4)},${toLng.toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;

  try {
    const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM routing failed');
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    const distanceKm = route.distance / 1000;
    const durationMin = Math.ceil(route.duration / 60);
    // GeoJSON coordinates are [lng, lat], flip to [lat, lng] for Leaflet
    const polyline: [number, number][] = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng]
    );

    const result: RouteResult = {
      distance: Math.round(distanceKm * 10) / 10,
      duration: durationMin,
      polyline,
    };

    routeCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Calculates delivery fee based on driving distance.
 * Base: 20 EGP + 5 EGP per km.
 */
export function calcDeliveryFee(distanceKm: number): number {
  return Math.round(20 + distanceKm * 5);
}
