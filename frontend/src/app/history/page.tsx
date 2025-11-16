"use client";

import React, { JSX, useState } from "react";
import WeatherHistoryCharts from "@/components/WeatherHistoryCharts";
import DateRangeSelector from "@/components/DateRangeSelector";
import Link from "next/link";

type HistoryRow = {
  [key: string]: string | number | null;
};

export default function HistoryPage(): JSX.Element {
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<"hourly" | "daily" | null>(null);
  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

  async function fetchHistory(start: string, end: string) {
    if (!city.trim()) {
      setError("Enter a city name first.");
      return;
    }

    setLoading(true);
    setError("");
    setHistoryData([]);

    try {
      const url = `${API_BASE}/api/weather/history?city=${encodeURIComponent(
        city
      )}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

      const res = await fetch(url);

      if (!res.ok) {
        const errText = await res.text();
        console.error("API Error:", res.status, errText);
        setError(`Failed to fetch history (status ${res.status}).`);
        setLoading(false);
        return;
      }

      const json = await res.json();

      if (!json || !json.mode || !json.data) {
        setError("Invalid response from server.");
        setLoading(false);
        return;
      }

      setMode(json.mode);
      setHistoryData(json.data);
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error. Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:py-12 flex justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-4">
        <Link
          href="/"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          ← Back to Home
        </Link>
      </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6 text-center tracking-tight">
          Historical Weather Data
        </h1>

        {/* City input */}
        <div className="mb-6">
          <label htmlFor="city" className="sr-only">
            City
          </label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name"
            className="w-full p-3 border rounded-lg text-black mb-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="City name"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">Type a city and then select dates.</p>
            <p className="text-xs text-gray-400">Prefer full names (e.g. &quot;Bengaluru&quot;)</p>
          </div>
        </div>

        {/* Date range selector card — overflow-x-auto prevents layout break on tiny screens */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md mb-6 overflow-x-auto">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-black">Select Date Range</h2>

          {/* wrapper ensures DateRangeSelector can layout responsively */}
          <div className="w-full min-w-0">
            {/* DateRangeSelector is expected to call onChange(startISO, endISO) */}
            <DateRangeSelector onChange={fetchHistory} />
          </div>
        </div>

        {/* Feedback */}
        {loading && <p className="text-black">Loading history…</p>}
        {!loading && error && <p className="text-red-600">{error}</p>}
        {!loading && !error && historyData.length === 0 && (
          <p className="text-gray-600">Select a date range to view history.</p>
        )}

        {/* Charts */}
        {!loading && historyData.length > 0 && mode && (
          <div className="mt-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
              {/* Chart component should be responsive itself (see snippet below). */}
              <WeatherHistoryCharts mode={mode} data={historyData} city={city} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
