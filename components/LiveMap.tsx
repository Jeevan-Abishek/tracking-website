'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type LatLng = { lat: number; lng: number };

interface LiveMapProps {
  center: LatLng;
  path: LatLng[];
  markerColor?: string;
  className?: string;
}

// Free, no-API-key OSM raster style — swap for a vector style/MapTiler
// key later if you want nicer tiles; this keeps costs at zero for launch.
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }]
};

export default function LiveMap({ center, path, markerColor = '#FFB020', className }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const firstFix = useRef(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE as any,
      center: [center.lng, center.lat],
      zoom: 14,
      attributionControl: true
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': markerColor, 'line-width': 4, 'line-opacity': 0.85 }
      });
    });

    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.background = markerColor;
    el.style.border = '3px solid #1A1305';
    el.style.boxShadow = `0 0 0 6px ${markerColor}33`;

    markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([center.lng, center.lat]).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerRef.current) return;
    markerRef.current.setLngLat([center.lng, center.lat]);

    if (firstFix.current) {
      map.jumpTo({ center: [center.lng, center.lat], zoom: 16 });
      firstFix.current = false;
    } else {
      map.panTo([center.lng, center.lat]);
    }

    const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: path.map((p) => [p.lng, p.lat]) }
      });
    }
  }, [center, path]);

  return <div ref={containerRef} className={className ?? 'w-full h-full'} />;
}
