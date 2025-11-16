"use client";

import React, { useState } from "react";
import WeatherHistoryCharts from "@/components/WeatherHistoryCharts";
import DateRangeSelector from "@/components/DateRangeSelector";

type HistoryRow = {
  [key: string]: string | number | null;
};

export default function HistoryPage() {
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<"hourly" | "daily" | null>(null);
  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

  // ---------------------------------------------------------------------
  // Fetch history when DateRangeSelector changes (start, end)
  // ---------------------------------------------------------------------
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
      )}&start=${start}&end=${end}`;

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
    }

    setLoading(false);
  }

  // ---------------------------------------------------------------------
  // RENDER PAGE
  // ---------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-black mb-6 text-center">
          Historical Weather Data
        </h1>

        {/* CITY INPUT */}
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name"
          className="w-full p-3 border rounded-lg text-black mb-6"
        />

        {/* DATE RANGE SELECTOR */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Select Date Range</h2>
          <DateRangeSelector onChange={fetchHistory} />
        </div>

        {/* LOADING */}
        {loading && <p className="text-black">Loading history…</p>}

        {/* ERROR */}
        {!loading && error && <p className="text-red-600">{error}</p>}

        {/* EMPTY STATE */}
        {!loading && !error && historyData.length === 0 && (
          <p className="text-gray-600">Select a date range to view history.</p>
        )}

        {/* RENDER CHARTS */}
        {!loading && historyData.length > 0 && mode && (
          <div className="mt-6">
            <WeatherHistoryCharts mode={mode} data={historyData} city={city} />
          </div>
        )}
      </div>
    </div>
  );
}
