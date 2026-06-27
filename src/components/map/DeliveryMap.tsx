'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Search, Loader, X } from 'lucide-react';
import { reverseGeocode, searchAddress, NominatimResult } from '@/lib/nominatim';
import { getRoute, calcDeliveryFee } from '@/lib/osrm';

// ----------------------------------------------------------------
// We load Leaflet lazily because it accesses window/document.
// The parent must wrap this component with dynamic({ ssr: false }).
// ----------------------------------------------------------------

interface BranchMarker {
  id: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
}

interface Props {
  /** Initial pin latitude */
  initialLat?: number;
  /** Initial pin longitude */
  initialLng?: number;
  /** Called every time the pin moves with real coordinates + address + fee */
  onLocationChange?: (lat: number, lng: number, address: string, fee: number) => void;
  /** Branch markers to show on map */
  branches?: BranchMarker[];
  /** Selected branch (shown as origin for route) */
  selectedBranchLat?: number;
  selectedBranchLng?: number;
  /** Language */
  locale?: string;
  /** Height of the map container */
  height?: string;
}

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

// Dark CartoDB tiles — free, no key, beautiful dark design
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function DeliveryMap({
  initialLat = CAIRO_LAT,
  initialLng = CAIRO_LNG,
  onLocationChange,
  branches = [],
  selectedBranchLat,
  selectedBranchLng,
  locale = 'en',
  height = '320px',
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const branchMarkersRef = useRef<any[]>([]);

  const [pinLat, setPinLat] = useState(initialLat);
  const [pinLng, setPinLng] = useState(initialLng);
  const [pinAddress, setPinAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(40);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----------------------------------------------------------------
  // Update coordinates + reverse geocode + route calculation
  // ----------------------------------------------------------------
  const updatePin = useCallback(async (lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);

    // Move marker on map
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }

    let fee = 40;
    let addr = '';

    // Route via OSRM if branch coords available
    if (selectedBranchLat !== undefined && selectedBranchLng !== undefined) {
      const route = await getRoute(selectedBranchLat, selectedBranchLng, lat, lng);
      if (route) {
        fee = calcDeliveryFee(route.distance);
        setDistance(route.distance);
        setEta(route.duration);

        // Draw route polyline
        if (typeof window !== 'undefined') {
          const L = (window as any).L;
          if (L && mapRef.current) {
            if (routeLayerRef.current) {
              routeLayerRef.current.remove();
            }
            routeLayerRef.current = L.polyline(route.polyline, {
              color: '#dc2626',
              weight: 4,
              opacity: 0.8,
              dashArray: '8 6',
            }).addTo(mapRef.current);
          }
        }
      } else {
        // Fallback to Haversine distance
        const dist = haversine(selectedBranchLat, selectedBranchLng, lat, lng);
        fee = calcDeliveryFee(dist);
        setDistance(dist);
        setEta(Math.ceil(dist * 3)); // rough 3 min/km
      }
    } else {
      // No branch selected — use simple distance from Cairo center
      const dist = haversine(CAIRO_LAT, CAIRO_LNG, lat, lng);
      fee = calcDeliveryFee(dist);
      setDistance(dist);
    }

    setDeliveryFee(fee);

    // Reverse geocode
    addr = await reverseGeocode(lat, lng);
    setPinAddress(addr);

    onLocationChange?.(lat, lng, addr, fee);
  }, [selectedBranchLat, selectedBranchLng, onLocationChange]);

  // ----------------------------------------------------------------
  // Initialize Leaflet map
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // already initialized

    const L = (window as any).L;
    if (!L) return;

    // Fix Leaflet's default icon path issue in webpack builds
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Custom red delivery marker
    const deliveryIcon = L.divIcon({
      className: '',
      html: `<div style="
        display:flex;flex-direction:column;align-items:center;
        filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));
      ">
        <div style="
          background:#dc2626;color:white;font-size:9px;font-weight:900;
          padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;
          box-shadow:0 2px 6px rgba(220,38,38,0.5);
        ">${locale === 'en' ? 'Deliver Here' : 'وصل هنا'}</div>
        <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 8.845 12 20 12 20s12-11.155 12-20C24 5.373 18.627 0 12 0z" fill="#dc2626"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>`,
      iconSize: [40, 54],
      iconAnchor: [20, 54],
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: deliveryIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    mapRef.current = map;

    // Click to move pin
    map.on('click', (e: any) => {
      updatePin(e.latlng.lat, e.latlng.lng);
    });

    // Drag to move pin
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updatePin(pos.lat, pos.lng);
    });

    // Add branch markers
    if (branches.length) {
      addBranchMarkers(L, map, branches, locale);
    }

    // Initial reverse geocode
    updatePin(initialLat, initialLng);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // run once

  // ----------------------------------------------------------------
  // Update branch markers when prop changes
  // ----------------------------------------------------------------
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Clear old markers
    branchMarkersRef.current.forEach((m) => m.remove());
    branchMarkersRef.current = [];

    if (branches.length) {
      branchMarkersRef.current = addBranchMarkers(L, mapRef.current, branches, locale);
    }
  }, [branches, locale]);

  // ----------------------------------------------------------------
  // Address search with debounce
  // ----------------------------------------------------------------
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setShowResults(true);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchAddress(q);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 16);
    }
    updatePin(lat, lng);
  };

  // ----------------------------------------------------------------
  // GPS: Use current location
  // ----------------------------------------------------------------
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGpsError(locale === 'en' ? 'GPS not supported by this browser.' : 'GPS غير مدعوم في هذا المتصفح.');
      return;
    }
    setIsGettingLocation(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setIsGettingLocation(false);
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16);
        }
        updatePin(latitude, longitude);
      },
      (err) => {
        setIsGettingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(locale === 'en' ? 'Location permission denied.' : 'تم رفض إذن الموقع.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError(locale === 'en' ? 'Location unavailable.' : 'الموقع غير متاح.');
        } else {
          setGpsError(locale === 'en' ? 'GPS timeout. Please try again.' : 'انتهت مهلة GPS. حاول مرة أخرى.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={locale === 'en' ? 'Search address or landmark…' : 'ابحث عن عنوان أو معلم…'}
          className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl pl-9 pr-8 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
        />
        {isSearching && (
          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted animate-spin" />
        )}
        {searchQuery && !isSearching && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#18181B] border border-card-border rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-48 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onMouseDown={() => handleSelectResult(r)}
                className="w-full text-left px-3 py-2.5 text-xs text-text-muted hover:bg-card-border hover:text-white transition-colors border-b border-card-border/30 last:border-0 flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-primary-red shrink-0 mt-0.5" />
                <span className="truncate">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS button */}
      <button
        type="button"
        onClick={handleUseLocation}
        disabled={isGettingLocation}
        className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted hover:text-white transition-colors disabled:opacity-50"
      >
        <Navigation className={`h-3 w-3 ${isGettingLocation ? 'animate-pulse text-primary-red' : ''}`} />
        {isGettingLocation
          ? (locale === 'en' ? 'Detecting location…' : 'جارٍ تحديد موقعك…')
          : (locale === 'en' ? 'Use my current location' : 'استخدم موقعي الحالي')}
      </button>
      {gpsError && (
        <p className="text-[10px] text-red-400">{gpsError}</p>
      )}

      {/* Map container */}
      <div
        className="relative rounded-2xl overflow-hidden border border-card-border shadow-inner"
        style={{ height }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* HUD overlay */}
        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 text-[9px] text-text-muted font-mono space-y-0.5 z-[1000] pointer-events-none select-none">
          <div className="flex gap-2"><span>LAT:</span> <span className="text-white">{pinLat.toFixed(5)}</span></div>
          <div className="flex gap-2"><span>LNG:</span> <span className="text-white">{pinLng.toFixed(5)}</span></div>
          {distance !== null && (
            <div className="flex gap-2"><span>DIST:</span> <span className="text-sky-400">{distance} km</span></div>
          )}
          {eta !== null && (
            <div className="flex gap-2"><span>ETA:</span> <span className="text-green-400">{eta} min</span></div>
          )}
          <div className="flex gap-2"><span>FEE:</span> <span className="text-accent-amber font-bold">{deliveryFee} EGP</span></div>
        </div>
      </div>

      {/* Address preview */}
      {pinAddress && (
        <p className="text-[10px] text-text-muted flex items-start gap-1.5">
          <MapPin className="h-3 w-3 text-primary-red shrink-0 mt-0.5" />
          <span>{pinAddress}</span>
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(d: number) { return d * (Math.PI / 180); }

function addBranchMarkers(L: any, map: any, branches: BranchMarker[], locale: string) {
  return branches.map((b) => {
    if (!b.lat || !b.lng) return null;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#f59e0b;color:#000;font-size:8px;font-weight:900;
        padding:3px 6px;border-radius:6px;white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        border:1.5px solid rgba(255,255,255,0.2);
      ">🏪 ${locale === 'en' ? b.nameEn : b.nameAr}</div>`,
      iconSize: [120, 24],
      iconAnchor: [60, 24],
    });
    return L.marker([b.lat, b.lng], { icon }).addTo(map);
  }).filter(Boolean);
}
