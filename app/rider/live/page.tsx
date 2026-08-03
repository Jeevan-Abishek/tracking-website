'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import LiveMap, { type LatLng } from '@/components/LiveMap';

export const dynamic = 'force-dynamic';

const DEFAULT_CENTER: LatLng = { lat: 13.0827, lng: 80.2707 }; // Chennai fallback
const WRITE_THROTTLE_MS = 3000;

export default function RiderLivePage() {
  const supabase = createClient();
  const router = useRouter();

  const [tripId, setTripId] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [path, setPath] = useState<LatLng[]>([]);
  const [speed, setSpeed] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const lastWriteRef = useRef(0);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/rider');
        return;
      }

      const riderName = userData.user.email?.split('@')[0] || 'Rider';

      // generate a unique code, retry on collision
      let code = '';
      let created: { id: string; share_code: string } | null = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const { data: codeData } = await supabase.rpc('generate_share_code');
        if (typeof codeData === 'string' && codeData.trim()) {
          code = codeData;
        }
        const { data: insertData, error: insertErr } = await supabase
          .from('trips')
          .insert({ rider_id: userData.user.id, rider_name: riderName, share_code: code, status: 'active' })
          .select('id, share_code')
          .single();
        if (!insertErr) created = insertData;
      }

      if (cancelled) return;
      if (!created) {
        setError('Could not start the trip. Please try again.');
        return;
      }

      setTripId(created.id);
      setShareCode(created.share_code);
      startWatch(created.id);
    }

    init();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startWatch(tId: string) {
    if (!('geolocation' in navigator)) {
      setError("This device/browser doesn't support location sharing.");
      return;
    }
    startedAtRef.current = Date.now();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => onPosition(tId, pos),
      (err) => setError('Location error: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }

  async function onPosition(tId: string, pos: GeolocationPosition) {
    const { latitude, longitude, speed: rawSpeed } = pos.coords;
    const kmh = rawSpeed ? Math.round(rawSpeed * 3.6) : 0;
    const point: LatLng = { lat: latitude, lng: longitude };

    setCenter(point);
    setSpeed(kmh);
    setPath((prev) => [...prev, point].slice(-300));
    setPointCount((c) => c + 1);

    const now = Date.now();
    if (now - lastWriteRef.current < WRITE_THROTTLE_MS) return;
    lastWriteRef.current = now;

    await supabase
      .from('trips')
      .update({ last_lat: latitude, last_lng: longitude, last_speed_kmh: kmh, last_update: new Date().toISOString() })
      .eq('id', tId);

    await supabase.from('trip_points').insert({ trip_id: tId, lat: latitude, lng: longitude, speed_kmh: kmh });
  }

  async function endTrip() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (tripId) {
      await supabase.from('trips').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', tripId);
    }
    router.push('/');
  }

  function copyCode() {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 bg-surface border-b border-line">
        <div>
          <div className="text-[11px] text-muted uppercase tracking-wide">Your code</div>
          <div className="font-mono text-xl tracking-widest text-amber">{shareCode ?? '——————'}</div>
        </div>
        <button onClick={copyCode} className="bg-surface2 border border-line rounded-lg px-3.5 py-2 text-xs">
          Copy
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <LiveMap center={center} path={path} markerColor="#22D3B5" />
      </div>

      {error && <p className="text-danger text-xs text-center py-2 px-4">{error}</p>}

      <div className="flex bg-surface border-t border-line py-3.5 px-2">
        <Stat val={`${speed}`} label="km/h" />
        <Stat val={fmtTime(elapsed)} label="elapsed" />
        <Stat val={`${pointCount}`} label="points" />
      </div>
      <Button variant="danger" onClick={endTrip} className="mx-4 mb-4">
        End trip
      </Button>
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
