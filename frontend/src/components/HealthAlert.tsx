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

  const [ok, setOk] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const timerRef = useRef<number | null>(null);

  const SLOW_THRESHOLD_MS = 1500;
  const POLL_INTERVAL_MS = 10_000;

  // Detect mobile
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

      await res.json().catch(() => ({}));

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
      setOk(false);
      setDegraded(false);
      if (err instanceof Error) setMessage(err.message);
      else setMessage('Backend unreachable');
      setLastChecked(Date.now());
    }
  }

  useEffect(() => {
  // inline the health check so the effect does not depend on external function identity
    let cancelled = false;

    async function runCheck() {
      try {
        const t0 = performance.now();
        const res = await fetch(HEALTH_URL, { cache: "no-store" });
        const t1 = performance.now();
        const roundTrip = Math.round(t1 - t0);
        if (cancelled) return;

        setLastChecked(Date.now());

        if (!res.ok) {
          setOk(false);
          setMessage(`Backend returned ${res.status}`);
          setDegraded(false);
          return;
        }

        // parse JSON but ignore parse failures
        await res.json().catch(() => ({}));

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
        if (cancelled) return;
        setOk(false);
        setDegraded(false);
        if (err instanceof Error) setMessage(err.message);
        else setMessage("Backend unreachable");
        setLastChecked(Date.now());
      }
    }

    // call once (deferred to avoid sync state-in-effect lint)
    const initial = setTimeout(() => {
      runCheck();
      // schedule periodic polling
      timerRef.current = window.setInterval(runCheck, POLL_INTERVAL_MS);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (ok === false || degraded) {
      const t = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(t);
    }
    return;
  }, [ok, degraded]);


  if (ok === null || !visible) return null;

  const bg = ok
    ? degraded
      ? 'bg-yellow-50 border-yellow-400'
      : 'bg-green-50 border-green-400'
    : 'bg-red-50 border-red-400';

  const text = ok
    ? degraded
      ? 'Backend degraded'
      : 'Backend healthy'
    : 'Service unavailable';

  const icon = ok ? (degraded ? '⚠️' : '✅') : '🚨';

  // Positioning logic:
  // Desktop = top-right
  // Mobile = bottom-right floating alert
  const containerClasses = isMobile
    ? "fixed bottom-4 right-4 w-[85%] max-w-sm z-[100] animate-fadeIn"
    : "fixed top-4 right-4 w-full max-w-md z-[100] animate-fadeIn";

  return (
    <div className={`${containerClasses} ${bg} border-l-4 p-3 shadow-lg rounded-lg`}>
      <div className="flex items-start gap-3">
        <div className="text-xl">{icon}</div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{text}</div>

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
            Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : "—"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            aria-label="Refresh health"
            title="Refresh"
            onClick={() => checkHealth()}
            className="px-2 py-1 text-sm rounded text-gray-700 hover:bg-gray-200"
          >
            Refresh
          </button>
          <button
            aria-label="Dismiss"
            title="Dismiss"
            onClick={() => setVisible(false)}
            className="px-2 py-1 text-sm rounded text-gray-700 hover:bg-gray-200"
          >
            ✖
          </button>
        </div>
      </div>
    </div>
  );
}
