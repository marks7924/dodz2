'use client';

/**
 * LazyDeliveryMap — SSR-safe dynamic import wrapper for DeliveryMap.
 *
 * Usage:
 *   import LazyDeliveryMap from '@/components/map/LazyDeliveryMap';
 *   <LazyDeliveryMap ... />
 *
 * This file exists because Leaflet accesses window/document and cannot run on the server.
 */

import dynamic from 'next/dynamic';

const LazyDeliveryMap = dynamic(() => import('./DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full rounded-2xl bg-[#18181B] border border-card-border flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-red" />
        <p className="text-[10px] text-text-muted font-medium">Loading map…</p>
      </div>
    </div>
  ),
});

export default LazyDeliveryMap;
