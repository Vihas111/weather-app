'use client';
import React, { useEffect, useState, useRef } from 'react';

type HealthResponse = {
  status?: string;
  uptime_seconds?: number;
  timestamp?: number;
};

export default function HealthAlert() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';
  const HEALTH_URL = `${API_BASE.replace(/\/$/, '')}/health`;

  const [ok, setOk] = useState<boolean | null>(null); // null = unknown, true = ok, false = down
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  // thresholds
  const SLOW_THRESHOLD_MS = 1500;   // if backend takes > 1.5s, mark degraded
  const POLL_INTERVAL_MS = 10_000;  // poll every 10s

  async function checkHealth() {
    try {
      const t0 = performance.now();
      const res = await fetch(HEALTH_URL, { cache: 'no-store' });
      const t1 = performance.now();
      const roundTrip = Math.round(t1 - t0);
      setLastChecked(Date.now());

      if (!res.ok) {
        setOk(false);
        setMessage(`Backend returned ${res.status}`);
        setDegraded(false);
        return;
      }

      // parse possible JSON
      const json: HealthResponse = await res.json().catch(() => ({}));

      // if API returned "ok" but response time large -> degraded
      if (roundTrip > SLOW_THRESHOLD_MS) {
        setOk(true);
        setDegraded(true);
        setMessage(`Degraded: backend slow (${roundTrip} ms)`);
      } else {
        setOk(true);
        setDegraded(false);
        setMessage(null);
      }
    } catch (err: unknown) {
      // network/error: backend unreachable
      setOk(false);
      setDegraded(false);
      if (err instanceof Error) setMessage(err.message);
      else setMessage('Backend unreachable');
      setLastChecked(Date.now());
    }
  }

  useEffect(() => {
    // initial check immediately
    checkHealth();

    // periodic polling
    timerRef.current = window.setInterval(() => {
      checkHealth();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user dismissed the banner keep checking silently but don't show until next failure
  useEffect(() => {
    if (ok === false && visible === false) {
      // user dismissed but backend still down; show again after next poll
      // (no extra logic required because checkHealth sets visible true below)
    }
  }, [ok, visible]);

  useEffect(() => {
    // auto-show banner when state becomes unhealthy
    if (ok === false || (ok === true && degraded)) {
      setVisible(true);
    }
  }, [ok, degraded]);

  if (ok === null || !visible) return null;

  const bg = ok ? (degraded ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400') : 'bg-red-50 border-red-400';
  const text = ok ? (degraded ? 'Degraded - backend is slow' : 'All systems nominal') : 'Service unavailable';
  const icon = ok ? (degraded ? '⚠️' : '✅') : '🚨';

  return (
    <div className={`${bg} border-l-4 p-3 fixed top-4 right-4 z-50 max-w-md shadow-md`}>
      <div className="flex items-start gap-3">
        <div className="text-xl">{icon}</div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">
            {ok ? (degraded ? 'Backend degraded' : 'Backend healthy') : 'Backend down'}
          </div>
          <div
            className={`text-sm mt-1 ${
                ok ? (degraded ? 'text-yellow-800' : 'text-green-800')
                : 'text-red-800 font-medium'
            }`}
            >
            {message ?? text}
            </div>

            <div
            className={`text-xs mt-1 ${
                ok ? (degraded ? 'text-yellow-700' : 'text-gray-700')
                : 'text-red-700'
            }`}
            >
            Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : '—'}
            </div>

        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            aria-label="Refresh health"
            title="Refresh now"
            onClick={() => checkHealth()}
            className="px-2 py-1 text-sm rounded text-gray-950 hover:bg-gray-100"
          >
            Refresh
          </button>
          <button
            aria-label="Dismiss"
            title="Dismiss"
            onClick={() => setVisible(false)}
            className="px-2 py-1 text-sm rounded text-gray-950 hover:bg-gray-100"
          >
            ✖
          </button>
        </div>
      </div>
    </div>
  );
}
