"use client";

import { useEffect, useRef, useState } from "react";
// import { Bell } from "lucide-react"; // optional icon

type BreachEntry = {
  city: string;
  breaches: string[];
};

type AlertStatus = {
  active: boolean;
  breaches: BreachEntry[];
};

interface AlertSidebarProps {
  active?: boolean;
  breaches?: BreachEntry[];
}

export default function AlertSidebar({ active, breaches }: AlertSidebarProps) {
  const [alert, setAlert] = useState<AlertStatus | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ping badge animation state
  const [pingBadge, setPingBadge] = useState(false);
  const prevCountRef = useRef<number>(0);

  const usingProps = active !== undefined || breaches !== undefined;

  // detect mobile width
  useEffect(() => {
    function checkMobile() {
      const mobile = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(Boolean(mobile));
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // fetch alerts periodically (skip when props used)
  useEffect(() => {
    if (usingProps) return;

    let cancelled = false;
    async function fetchAlerts() {
      try {
        const res = await fetch("http://127.0.0.1:8000/alerts/status", {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setAlert({ active: false, breaches: [] });
          return;
        }
        const data: AlertStatus = await res.json();
        if (!cancelled) setAlert(data);
      } catch (err) {
        // silent fail - show no alerts state
        // eslint-disable-next-line no-console
        console.log("Alert fetch failed", err);
      }
    }

    fetchAlerts();
    const iv = setInterval(fetchAlerts, 1500);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [usingProps]);

  const display: AlertStatus = usingProps
    ? { active: active ?? false, breaches: breaches ?? [] }
    : alert ?? { active: false, breaches: [] };

  const alertsCount = display?.active ? display.breaches.length : 0;

  // ping animation when count increases (deferred to avoid sync setState in effect)
  useEffect(() => {
    const prev = prevCountRef.current;
    if (alertsCount > prev) {
      const startTimer = setTimeout(() => {
        setPingBadge(true);
        const endTimer = setTimeout(() => setPingBadge(false), 700);
        // ensure prevCountRef updated after starting animation
        prevCountRef.current = alertsCount;
        // cleanup for end timer
        // Note: returning from setTimeout callback cannot clean outer timeout; we handle cleanup below.
      }, 0);

      return () => {
        clearTimeout(startTimer);
      };
    }
    prevCountRef.current = alertsCount;
    return;
  }, [alertsCount]);

  // lock body scroll when drawer open on mobile
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (drawerOpen && isMobile) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, isMobile]);

  // reusable sidebar content — render breaches as plain <li>{b}</li> so tests can find text nodes
  const SidebarContent = (
    <>
      <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
        ⚠️ Extreme Alerts
      </h2>

      {!display?.active ? (
        <p className="text-green-600 mt-2">No extreme weather alerts 😊</p>
      ) : (
        display.breaches.map((entry) => (
          <div
            key={entry.city}
            className="bg-red-50 border border-red-300 rounded-lg p-3 mt-3"
          >
            <p className="font-semibold text-red-800">{entry.city}</p>
            <ul className="ml-4 mt-1 text-sm text-gray-700">
              {entry.breaches.map((b, idx) => (
                // render plain text inside li so tests can findByText("Heatwave") etc.
                <li key={idx}>{b}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar (unchanged) */}
      <div className="hidden md:block fixed top-20 left-5 w-80 max-h-[70vh] overflow-y-auto bg-white border border-red-300 rounded-xl shadow-lg p-4 z-40">
        {SidebarContent}
      </div>

      {/* Mobile FAB — kept bottom-right to avoid covering inputs */}
      <button
        onClick={() => setDrawerOpen(true)}
        className={`md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full 
          bg-red-600 text-white shadow-2xl flex items-center justify-center 
          text-3xl font-bold z-40 border-4 border-white animate-alertPulse`}
        title="Extreme weather alerts"
        aria-label="Open alerts"
      >
        <span className="select-none">⚠️</span>

        {alertsCount > 0 && (
          <span
            className={`absolute -top-2 -right-2 bg-yellow-300 text-black px-2 py-0.5 rounded-full text-xs font-bold shadow-md
              ${pingBadge ? "animate-pingOnce" : ""}`}
            aria-hidden
          >
            {alertsCount}
          </span>
        )}
      </button>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Extreme alerts"
            className="fixed top-0 left-0 h-full w-72 bg-white shadow-2xl p-5 z-50 md:hidden animate-slideIn"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-red-600">⚠️ Extreme Alerts</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-600 text-xl font-bold hover:text-black"
                aria-label="Close alerts"
              >
                ✖
              </button>
            </div>

            <div className="overflow-y-auto">{SidebarContent}</div>
          </aside>
        </>
      )}
    </>
  );
}
