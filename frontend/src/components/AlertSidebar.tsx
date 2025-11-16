"use client";

import { useEffect, useRef, useState } from "react";
// 1. IMPORT FIX: Removed 'ThresholdSetting' which was unused
import { useSettings } from "@/app/context/SettingsContext";

// --- Types ---
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

// 2. DEFINE THE TYPE FOR THE RAW WEATHER DATA
interface BackendWeatherResponse {
  current: {
    temp_c: number;
    wind_kph: number;
    humidity: number;
    condition: object;
    sunrise: string;
    sunset: string;
    chance_of_rain: number;
  };
  // ... other fields
}

// 3. DEFINE THE BACKEND URL
const backendUrl =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export default function AlertSidebar({ active, breaches }: AlertSidebarProps) {
  // --- ALL HOOKS MUST BE CALLED AT THE TOP ---
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const [alert, setAlert] = useState<AlertStatus | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // data fetching logic
  useEffect(() => {
    if (usingProps || isSettingsLoading) return;
    let cancelled = false;

    async function checkAlerts() {
      if (settings.length === 0) {
        if (!cancelled) setAlert({ active: false, breaches: [] });
        return;
      }
      try {
        const fetchPromises = settings.map((setting) =>
          fetch(
            `${backendUrl}/weather?city=${encodeURIComponent(setting.city)}`,
            { cache: "no-store" }
          ).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch weather for ${setting.city}`);
            }
            return res.json() as Promise<BackendWeatherResponse>;
          })
        );
        const allWeatherResponses = await Promise.all(fetchPromises);
        const newBreaches: BreachEntry[] = [];
        for (let i = 0; i < settings.length; i++) {
          const setting = settings[i];
          const weather = allWeatherResponses[i];
          const currentTemp = weather.current.temp_c;
          const currentChanceOfRain = weather.current.chance_of_rain;
          const cityBreaches: string[] = [];
          if (setting.max_temp !== 999 && currentTemp > setting.max_temp) {
            cityBreaches.push(
              `Temp: ${currentTemp}° (Max: ${setting.max_temp}°) `
            );
          }
          if (setting.min_temp !== -999 && currentTemp < setting.min_temp) {
            cityBreaches.push(
              `Temp: ${currentTemp}° (Min: ${setting.min_temp}°) `
            );
          }
          if (
            setting.max_chance_of_rain !== 999 &&
            currentChanceOfRain > setting.max_chance_of_rain
          ) {
            cityBreaches.push(
              `Rain: ${currentChanceOfRain}% (Max: ${setting.max_chance_of_rain}%)`
            );
          }
          if (cityBreaches.length > 0) {
            newBreaches.push({ city: setting.city, breaches: cityBreaches });
          }
        }
        if (!cancelled) {
          setAlert({
            active: newBreaches.length > 0,
            breaches: newBreaches,
          });
        }
      } catch (err) {
        console.error("Alert check failed", err);
        if (!cancelled) setAlert({ active: false, breaches: [] });
      }
    }
    checkAlerts();
    const iv = setInterval(checkAlerts, 15000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [usingProps, settings, isSettingsLoading]);

  // This is the data used for rendering, safe to derive state
  const display: AlertStatus = usingProps
    ? { active: active ?? false, breaches: breaches ?? [] }
    : alert ?? { active: false, breaches: [] };

  const alertsCount = display?.active ? display.breaches.length : 0;

  // 4. --- HOOKS MOVED UP ---
  // ping animation when count increases
  useEffect(() => {
    const prev = prevCountRef.current;
    if (alertsCount > prev) {
      const startTimer = setTimeout(() => {
        setPingBadge(true);
        setTimeout(() => setPingBadge(false), 700);
        prevCountRef.current = alertsCount;
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
  
  // 5. --- EARLY RETURN IS NOW *AFTER* ALL HOOKS ---
  // If the settings are still loading from localStorage, render nothing.
  if (isSettingsLoading) {
    return null;
  }
  // --- END OF FIX ---


  // reusable sidebar content
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
      {/* Desktop sidebar */}
      <div className="hidden md:block fixed top-20 left-5 w-80 max-h-[70vh] overflow-y-auto bg-white border border-red-300 rounded-xl shadow-lg p-4 z-40">
        {SidebarContent}
      </div>

      {/* Mobile FAB */}
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
              <h2 className="text-lg font-bold text-red-600">
                ⚠️ Extreme Alerts
              </h2>
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