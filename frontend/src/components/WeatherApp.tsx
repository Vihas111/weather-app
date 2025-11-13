"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Cloud } from "lucide-react";

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

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

  const fetchWeather = useCallback(async (forCity: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const url = `${API_BASE.replace(
        /\/$/,
        ""
      )}/weather?city=${encodeURIComponent(forCity)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
      }
      const json: WeatherData = await res.json();
      setData(json);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchWeather(city);
  }, [fetchWeather, city]);

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
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h2 className="text-4xl font-bold text-gray-900">
                {data.location.city}
              </h2>
              <p className="text-gray-500 text-lg">{data.location.region}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Today's Forecast
              </h3>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
