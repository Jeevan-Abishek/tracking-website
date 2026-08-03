'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LiveMap, { type LatLng } from '@/components/LiveMap';

const DEFAULT_CENTER: LatLng = { lat: 13.0827, lng: 80.2707 };

type TripSummary = {
  id: string;
  rider_name: string;
  status: 'active' | 'ended';
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed_kmh?: number | null;
  last_update?: string | null;
};

type TripPoint = {
  lat: number;
  lng: number;
};

type TripUpdateRow = {
  status?: 'active' | 'ended';
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed_kmh?: number | null;
  last_update?: string | null;
};

export const dynamic = 'force-dynamic';

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export default function TrackerLivePage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const code = params.code.toUpperCase();

  const [riderName, setRiderName] = useState('Rider');
  const [status, setStatus] = useState<'active' | 'ended' | 'loading' | 'not_found' | 'error'>('loading');
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [path, setPath] = useState<LatLng[]>([]);
  const [speed, setSpeed] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [totalDist, setTotalDist] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastPointRef = useRef<LatLng | null>(null);
  const tripIdRef = useRef<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      try {
        // Add timeout to RPC call
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout: Supabase took too long to respond')), 10000)
        );

        const rpcPromise = supabase.rpc('get_trip_by_code', { p_code: code }).maybeSingle();
        const result = await Promise.race([rpcPromise, timeoutPromise]);
        const { data, error } = result as any;

        if (error) {
          console.error('Supabase RPC error:', error);
          setErrorMsg(`Error loading trip: ${error.message}`);
          setStatus('error');
          return;
        }

        const trip = data as TripSummary | null;
        if (!trip) {
          setStatus('not_found');
          return;
        }

        tripIdRef.current = trip.id;
        setRiderName(trip.rider_name);
        setStatus(trip.status);
        if (trip.last_lat && trip.last_lng) {
          const point = { lat: trip.last_lat, lng: trip.last_lng };
          setCenter(point);
          lastPointRef.current = point;
          setSpeed(trip.last_speed_kmh ?? 0);
          setLastUpdate(trip.last_update ?? null);
        }

        const { data: points } = await supabase.rpc('get_trip_points_by_code', { p_code: code });
        const pathPoints = (points as TripPoint[] | null) ?? [];
        if (pathPoints) setPath(pathPoints.map((p) => ({ lat: p.lat, lng: p.lng })));

        // Realtime updates instead of polling
        channel = supabase
          .channel(`trip-${trip.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${trip.id}` },
            (payload) => {
              const row = payload.new as TripUpdateRow;
              setStatus(row.status ?? 'active');
              if (row.last_lat && row.last_lng) {
                const point = { lat: row.last_lat, lng: row.last_lng };
                if (lastPointRef.current) {
                  setTotalDist((d) => d + haversineKm(lastPointRef.current!, point));
                }
                lastPointRef.current = point;
                setCenter(point);
                setSpeed(row.last_speed_kmh ?? 0);
                setLastUpdate(row.last_update ?? null);
                setPath((prev) => [...prev, point]);
              }
            }
          )
          .subscribe();
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        console.error('Trip initialization error:', errorText);
        setErrorMsg(errorText);
        setStatus('error');
      }
    }

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (status === 'not_found') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted">No trip found for code <span className="text-white font-mono">{code}</span>.</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-danger font-semibold mb-2">Error loading trip</p>
          <p className="text-muted text-sm">{errorMsg}</p>
          <a href="/track" className="text-teal text-sm mt-4 inline-block">← Back</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 bg-surface border-b border-line">
        <div className="font-display text-lg">{riderName}</div>
        <div
          className={`font-mono text-[11.5px] px-2.5 py-1 rounded-full border ${
            status === 'active' ? 'text-teal border-teal/40' : 'text-muted border-line'
          }`}
        >
          {status === 'active' ? '● Live' : 'Trip ended'}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <LiveMap center={center} path={path} markerColor="#FFB020" />
      </div>

      <div className="flex bg-surface border-t border-line py-3.5 px-2">
        <Stat val={`${speed}`} label="km/h" />
        <Stat val={`${totalDist.toFixed(1)}`} label="km" />
        <Stat val={timeAgo(lastUpdate)} label="updated" />
      </div>
    </main>
  );
}

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="flex-1 text-center px-2">
      <div className="font-mono text-[17px]">{val}</div>
      <div className="text-[10.5px] text-muted uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
