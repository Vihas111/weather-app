"use client";

import React, { useState, useEffect } from "react";
import { Cloud, Sun } from "lucide-react";

type Hour = {
  time: string;
  temp: number;
  icon: string;
  wind: number;
};

type Day = {
  date: string;
  max_temp: number;
  min_temp: number;
  condition: string;
  icon: string;
};

type WeatherData = {
  location: { city: string; region: string };
  current: {
    temp: number;
    condition: string;
    icon: string;
    humidity: number;
    wind: number;
  };
  hourly: Hour[];
  daily: Day[];
  backend_duration_ms?: number;
};

export default function WeatherApp() {
  const [city, setCity] = useState("San Francisco");
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alertData, setAlertData] = useState<any>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

  // ---------------------------------------------------------------------
  // Fetch EXTREME ALERTS continuously
  // ---------------------------------------------------------------------
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/alerts/status", {
          cache: "no-store",
        });
        const json = await res.json();

        console.log("🔥 RAW ALERT DATA FROM BACKEND:", json); // <--- LOG #1

        setAlertData(json);
      } catch {}
    };

    fetchAlerts();
    const int = setInterval(fetchAlerts, 1500);
    return () => clearInterval(int);
  }, []);

  // ---------------------------------------------------------------------
  // Fetch Weather When Searching
  // ---------------------------------------------------------------------
  async function fetchWeather(forCity: string) {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const url = `${API_BASE.replace(/\/$/, "")}/weather?city=${encodeURIComponent(
        forCity
      )}`;
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }

      const json: WeatherData = await res.json();
      console.log("🌍 RAW WEATHER DATA:", json); // <--- LOG #2

      setData(json);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Fetch default landing city
  useEffect(() => {
    fetchWeather(city);
  }, []);

  // ---------------------------------------------------------------------
  // FINAL FIX: accurate city–alert matching + logging
  // ---------------------------------------------------------------------
  const isCityAlerted =
    alertData?.active &&
    data &&
    alertData?.breaches?.some((entry: any) => {
      const alertCity = entry.city.toLowerCase().replace(/[^a-z]/g, "");
      const weatherCity = data.location.city
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      const region = data.location.region
        .toLowerCase()
        .replace(/[^a-z]/g, "");

      console.log("🔎 Comparing:", {
        alertCity,
        weatherCity,
        region,
      }); // <--- LOG #3

      return (
        alertCity === weatherCity ||
        alertCity.includes(weatherCity) ||
        weatherCity.includes(alertCity) ||
        alertCity.includes(region) ||
        region.includes(alertCity)
      );
    });

  console.log("🚨 FINAL isCityAlerted =", isCityAlerted); // <--- LOG #4

  // ---------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cloud className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Weather Prediction App
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (city.trim()) fetchWeather(city.trim());
            }}
            className="flex items-center gap-2"
          >
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter city (e.g. London)"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data && (
          <div
            className={`p-8 rounded-xl shadow-md transition-all duration-300 ${
              isCityAlerted ? "bg-red-100 border-2 border-red-400" : "bg-white"
            }`}
          >
            <h2
              className={`text-4xl font-bold ${
                isCityAlerted ? "text-red-700" : "text-gray-900"
              }`}
            >
              {data.location.city}
            </h2>

            <p className="text-gray-500 text-lg">{data.location.region}</p>
          </div>
        )}
      </main>
    </div>
  );
}
