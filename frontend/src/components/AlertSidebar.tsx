"use client";

import { useEffect, useRef, useState } from "react";
// If you prefer an icon, uncomment the line below and use <Bell /> in the button
// import { Bell } from "lucide-react";

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

  // Small local state to trigger a one-time ping animation when count increases
  const [pingBadge, setPingBadge] = useState(false);
  const prevCountRef = useRef<number>(0);

  const usingProps = active !== undefined || breaches !== undefined;

  // Detect mobile width
  useEffect(() => {
    function checkMobile() {
      const mobile = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(Boolean(mobile));
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch alerts periodically (skip if using props)
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
        // fail silently
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

  // Trigger ping animation when alertsCount increases
  useEffect(() => {
    const prev = prevCountRef.current;
    if (alertsCount > prev) {
      setPingBadge(true);
      // clear ping after animation length
      const t = setTimeout(() => setPingBadge(false), 700);
      return () => clearTimeout(t);
    }
    prevCountRef.current = alertsCount;
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

  // render content (reusable)
  const SidebarContent = (
    <>
    

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
                <li key={idx}>• {b}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (visible >= md) */}
      <div className="hidden md:block fixed top-20 left-5 w-80 max-h-[70vh] overflow-y-auto bg-white border border-red-300 rounded-xl shadow-lg p-4 z-40">
        {SidebarContent}
      </div>

      {/* Mobile floating FAB (visible < md) */}
      <button
        onClick={() => setDrawerOpen(true)}
        className={`md:hidden fixed bottom-6 left-6 w-16 h-16 rounded-full 
          bg-red-600 text-white shadow-2xl flex items-center justify-center 
          text-3xl font-bold z-50 border-4 border-white animate-alertPulse`}
        title="Extreme weather alerts"
        aria-label="Open alerts"
      >
        {/* Use a bell icon if you prefer (uncomment import at top) */}
        {/* <Bell className="w-7 h-7" /> */}
        <span className="select-none">⚠️</span>

        {/* badge */}
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

      {/* Mobile Drawer + Backdrop */}
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
