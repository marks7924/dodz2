'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation, Truck, Clock, MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet default icon broken by webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface Props {
  customerLat: number;
  customerLng: number;
  branchLat?: number;
  branchLng?: number;
  branchName?: string;
  driverLat: number | null;
  driverLng: number | null;
  driverName?: string;
  orderStatus: string;
  locale?: string;
}

export default function LiveTrackingMap({
  customerLat,
  customerLng,
  branchLat,
  branchLng,
  branchName,
  driverLat,
  driverLng,
  driverName,
  orderStatus,
  locale = 'en',
}: Props) {
  const mapContainerRef   = useRef<HTMLDivElement>(null);
  const mapRef            = useRef<L.Map | null>(null);
  const driverMarkerRef   = useRef<L.Marker | null>(null);
  const routeLayerRef     = useRef<L.Polyline | null>(null);

  const [eta, setEta]           = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // ── Init map once ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: [number, number] =
      driverLat !== null && driverLng !== null
        ? [driverLat, driverLng]
        : [customerLat, customerLng];

    const map = L.map(mapContainerRef.current, { center, zoom: 14, zoomControl: true });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 20 }).addTo(map);
    mapRef.current = map;

    // Customer pin
    const customerIcon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.7))">
        <div style="background:#dc2626;color:white;font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;box-shadow:0 2px 6px rgba(220,38,38,0.5);">
          ${locale === 'en' ? 'Delivery Here' : 'التوصيل هنا'}
        </div>
        <svg width="28" height="36" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 8.845 12 20 12 20s12-11.155 12-20C24 5.373 18.627 0 12 0z" fill="#dc2626"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>`,
      iconSize: [40, 54],
      iconAnchor: [20, 54],
    });
    L.marker([customerLat, customerLng], { icon: customerIcon, zIndexOffset: 100 })
      .addTo(map)
      .bindPopup(locale === 'en' ? '📍 Your location' : '📍 موقعك');

    // Branch pin
    if (branchLat && branchLng) {
      const branchIcon = L.divIcon({
        className: '',
        html: `<div style="background:#f59e0b;color:#000;font-size:8px;font-weight:900;padding:3px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:1.5px solid rgba(255,255,255,0.25);">🏪 ${branchName || 'Branch'}</div>`,
        iconSize: [120, 24],
        iconAnchor: [60, 24],
      });
      L.marker([branchLat, branchLng], { icon: branchIcon }).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
      routeLayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create/move driver marker ─────────────────────────────────────
  const moveDriver = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (!driverMarkerRef.current) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#111;border:2px solid #22c55e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(34,197,94,0.6);">
          <span style="font-size:16px;">🛵</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      driverMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 500 })
        .addTo(mapRef.current)
        .bindPopup(`🛵 ${driverName || (locale === 'en' ? 'Driver' : 'السائق')}`);
    } else {
      driverMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [driverName, locale]);

  // ── Update driver + route when position changes ───────────────────
  useEffect(() => {
    if (driverLat === null || driverLng === null || !mapRef.current) return;
    moveDriver(driverLat, driverLng);

    // Fetch route
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${customerLng},${customerLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return;
        const route = data.routes[0];
        setDistance(Math.round((route.distance / 1000) * 10) / 10);
        setEta(Math.ceil(route.duration / 60));
        const poly: [number, number][] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        routeLayerRef.current?.remove();
        routeLayerRef.current = L.polyline(poly, { color: '#22c55e', weight: 4, opacity: 0.85, dashArray: '8 6' }).addTo(mapRef.current!);
      } catch { /* OSRM unavailable, skip */ }
    };
    fetchRoute();

    // Fit map to show driver + customer
    const bounds = L.latLngBounds([[driverLat, driverLng], [customerLat, customerLng]]);
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [driverLat, driverLng, customerLat, customerLng, moveDriver]);

  return (
    <div className="space-y-3">
      {/* Banner */}
      {orderStatus === 'ON_THE_WAY' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border"
          style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <Truck className="h-4 w-4 text-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-bold">
            {locale === 'en' ? 'Driver is on the way!' : 'السائق في الطريق إليك!'}
          </span>
          {eta !== null && (
            <span className="ml-auto text-[10px] text-green-300 font-mono font-bold">ETA ~{eta} min</span>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-card-border shadow-inner" style={{ height: '300px' }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* HUD */}
        {(distance !== null || eta !== null) && (
          <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5 text-[9px] text-text-muted font-mono space-y-1 z-[1000] pointer-events-none select-none">
            {distance !== null && (
              <div className="flex gap-2"><MapPin className="h-3 w-3 text-primary-red" /><span className="text-white">{distance} km {locale === 'en' ? 'away' : 'متبقية'}</span></div>
            )}
            {eta !== null && (
              <div className="flex gap-2"><Clock className="h-3 w-3 text-green-400" /><span className="text-green-300">~{eta} {locale === 'en' ? 'min' : 'دقيقة'}</span></div>
            )}
          </div>
        )}

        {/* Waiting for GPS overlay */}
        {(driverLat === null || driverLng === null) && orderStatus === 'ON_THE_WAY' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[2px] z-[999]">
            <div className="bg-black/80 border border-card-border rounded-2xl px-5 py-4 text-center space-y-2">
              <Navigation className="h-5 w-5 text-text-muted mx-auto animate-pulse" />
              <p className="text-[10px] text-text-muted font-medium">
                {locale === 'en' ? 'Waiting for driver GPS…' : 'في انتظار GPS السائق…'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
