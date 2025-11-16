"use client";

import { useEffect, useRef, useState } from "react";
// 1. IMPORT OUR NEW HOOK and the setting type
import { useSettings, ThresholdSetting } from "@/app/context/SettingsContext";

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
// This must match the JSON from your backend's /weather endpoint
interface BackendWeatherResponse {
  current: {
    temp_c: number;
    wind_kph: number;
    humidity: number;
    condition: object;
    sunrise: string;
    sunset: string;
    chance_of_rain: number; // This is the new field we need
  };
  // ... other fields like location, hourly, daily
}

// 3. DEFINE THE BACKEND URL
const backendUrl =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export default function AlertSidebar({ active, breaches }: AlertSidebarProps) {
  // 4. GET SETTINGS FROM OUR NEW CONTEXT
  const { settings, isLoading: isSettingsLoading } = useSettings();

  const [alert, setAlert] = useState<AlertStatus | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ping badge animation state
  const [pingBadge, setPingBadge] = useState(false);
  const prevCountRef = useRef<number>(0);

  const usingProps = active !== undefined || breaches !== undefined;

  // detect mobile width (No change here)
  useEffect(() => {
    function checkMobile() {
      const mobile = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(Boolean(mobile));
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 5. --- THIS IS THE REBUILT LOGIC ---
  // It now reads from our context instead of fetching /alerts/status
  useEffect(() => {
    // If props are passed in, or settings are still loading, do nothing.
    if (usingProps || isSettingsLoading) return;

    let cancelled = false;

    async function checkAlerts() {
      // If user has no saved settings, show no alerts.
      if (settings.length === 0) {
        if (!cancelled) setAlert({ active: false, breaches: [] });
        return;
      }

      try {
        // --- A. Create a list of fetch requests to run in parallel ---
        const fetchPromises = settings.map((setting) =>
          fetch(
            `${backendUrl}/weather?city=${encodeURIComponent(setting.city)}`,
            {
              cache: "no-store",
            }
          ).then((res) => {
            if (!res.ok) {
              // This will be caught by Promise.all
              throw new Error(`Failed to fetch weather for ${setting.city}`);
            }
            return res.json() as Promise<BackendWeatherResponse>;
          })
        );

        // --- B. Wait for all requests to finish ---
        const allWeatherResponses = await Promise.all(fetchPromises);
        const newBreaches: BreachEntry[] = [];

        // --- C. Compare weather data against settings ---
        for (let i = 0; i < settings.length; i++) {
          const setting = settings[i];
          const weather = allWeatherResponses[i];

          const currentTemp = weather.current.temp_c;
          const currentChanceOfRain = weather.current.chance_of_rain;

          const cityBreaches: string[] = [];

          // Check for breaches (using 999 / -999 as "N/A")
          if (setting.max_temp !== 999 && currentTemp > setting.max_temp) {
            cityBreaches.push(
              `Temp: ${currentTemp}° (Max: ${setting.max_temp}°)`
            );
          }
          if (setting.min_temp !== -999 && currentTemp < setting.min_temp) {
            cityBreaches.push(
              `Temp: ${currentTemp}° (Min: ${setting.min_temp}°)`
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

        // --- D. Update the component's state ---
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

    checkAlerts(); // Run immediately
    const iv = setInterval(checkAlerts, 15000); // And poll every 15 seconds
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // Re-run this entire effect if the user changes their settings
  }, [usingProps, settings, isSettingsLoading]);

  // 6. --- FROM HERE DOWN, THE FILE IS UNCHANGED ---
  // The rest of your component logic just works!

  const display: AlertStatus = usingProps
    ? { active: active ?? false, breaches: breaches ?? [] }
    : alert ?? { active: false, breaches: [] };

  const alertsCount = display?.active ? display.breaches.length : 0;

  // ping animation when count increases
  useEffect(() => {
    const prev = prevCountRef.current;
    if (alertsCount > prev) {
      const startTimer = setTimeout(() => {
        setPingBadge(true);
        const endTimer = setTimeout(() => setPingBadge(false), 700);
        // ensure prevCountRef updated after starting animation
        prevCountRef.current = alertsCount;
        return () => clearTimeout(endTimer); // Cleanup for inner timer
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