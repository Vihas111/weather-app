'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ErrorBanner from '@/components/ErrorBanner';
import WeatherCharts from '@/components/WeatherCharts';

// --- Weather data type (MODIFIED) ---
interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_c: number;
    condition: { text: string; icon: string };
    humidity: number;
    wind_kph: number;
    chance_of_rain: number; // <-- ADDED
  };
  hourly: Array<{
    time: string;
    temp: number;
    icon: string;
    wind: number;
    chance_of_rain: number; // <-- ADDED
  }>;
  daily: Array<{
    date: string;
    max_temp: number;
    min_temp: number;
    condition: string;
    icon: string;
    chance_of_rain: number; // <-- ADDED
  }>;
  backend_duration_ms?: number;
}

// --- Error response structure ---
interface ErrorResponse {
  detail?: string; // Updated based on your backend's 404/500
}

export default function HomePage() {
  const [city, setCity] = useState('');
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';

  // --- handleSearch (MODIFIED) ---
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim()) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const url = `${API_BASE.replace(
        /\/$/,
        ''
      )}/weather?city=${encodeURIComponent(city.trim())}`;

      const res = await fetch(url);

      if (!res.ok) {
        // --- THIS IS THE CORRECTED ERROR BLOCK ---
        let finalMessage = `Error: ${res.status}`;
        try {
          // Try to parse the JSON error message from FastAPI
          const json: ErrorResponse = await res.json();
          
          // **THE FIX IS HERE:**
          // We must check if json.detail is a string before parsing
          if (typeof json.detail === 'string') {
            // The error message from WeatherAPI is nested in 'detail'
            const detailData = JSON.parse(json.detail);
            if (detailData.error && detailData.error.message) {
              finalMessage = detailData.error.message; // e.g., "No matching location found."
            } else {
              // Fallback if detail is not a string
              finalMessage = `Invalid city or API error (${res.status})`;
            }
          }
        } catch {
          // Fallback if parsing fails
          finalMessage = `Invalid city or API error (${res.status})`;
        }
        throw new Error(finalMessage);
        // --- END OF CORRECTED BLOCK ---
      }

      const weatherData = await res.json();

      // Normalize to WeatherData (MODIFIED)
      const normalized: WeatherData = {
        location: {
          name: weatherData.location?.name ?? '',
          region: weatherData.location?.region ?? '',
          country: weatherData.location?.country ?? '',
        },
        current: {
          temp_c: weatherData.current?.temp_c ?? 0,
          condition:
            weatherData.current?.condition ?? { text: '', icon: '' },
          humidity: weatherData.current?.humidity ?? 0,
          wind_kph: weatherData.current?.wind_kph ?? 0,
          chance_of_rain: weatherData.current?.chance_of_rain ?? 0, // <-- ADDED
        },
        hourly: weatherData.hourly ?? [], // These arrays now include chance_of_rain
        daily: weatherData.daily ?? [], // These arrays now include chance_of_rain
        backend_duration_ms: weatherData.backend_duration_ms ?? 0,
      };

      setData(normalized);

      // --- OLD ALERT FETCH REMOVED ---
      // The AlertSidebar now handles all alert logic independently.

    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // --- OLD ALERT LOGIC REMOVED ---
  // const cityUnderAlert = ...

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* MAIN SEARCH CARD */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Nimbus Weather
          </h1>

          <div className="flex gap-4">
            <Link
              href="/history"
              className="text-gray-500 hover:text-blue-600"
            >
              History
            </Link>

            <Link
              href="/settings"
              className="text-gray-500 hover:text-blue-600"
            >
              Settings
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            placeholder="Enter city name..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            type="submit"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </form>

        {error && <ErrorBanner message={error} />}
      </div>

      {/* WEATHER DETAILS */}
      {data && (
        <div className="w-full max-w-3xl space-y-6">
          {/* CURRENT WEATHER CARD (MODIFIED) */}
          <div
            className={`p-8 rounded-xl shadow-md flex justify-between items-center bg-white`} // <-- REMOVED RED BORDER LOGIC
          >
            <div>
              <h2 className="text-4xl font-bold text-gray-900">
                {data.location.name}
              </h2>
              <p className="text-gray-500">{data.location.region}</p>

              <div className="mt-4 flex items-center gap-4">
                <span className="text-7xl font-bold text-gray-800">
                  {data.current.temp_c}°
                </span>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    data.current.condition.icon?.startsWith('http')
                      ? data.current.condition.icon
                      : `https:${data.current.condition.icon}`
                  }
                  alt="weather icon"
                  className="w-20 h-20"
                />
              </div>

              <p className="text-xl text-blue-600 mt-2">
                {data.current.condition.text}
              </p>
            </div>

            <div className="text-right text-gray-700 text-lg space-y-2">
              <p>Humidity: {data.current.humidity}%</p>
              <p>Wind: {data.current.wind_kph} km/h</p>
              <p>Rain: {data.current.chance_of_rain}%</p> {/* <-- ADDED */}
              {typeof data.backend_duration_ms === 'number' && (
                <p className="text-sm text-gray-500">
                  Backend: {data.backend_duration_ms} ms
                </p>
              )}
            </div>
          </div>

          {/* HOURLY FORECAST (MODIFIED) */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {"Today's Forecast"}
            </h3>

            <div className="flex overflow-x-auto gap-4 pb-2">
              {data.hourly.map((h) => (
                <div
                  key={h.time}
                  className="min-w-[110px] bg-blue-50 p-4 rounded-lg text-center"
                >
                  <p className="text-gray-600 font-medium">
                    {/* Format the time nicely */}
                    {new Date(h.time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </p>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      h.icon?.startsWith('http')
                        ? h.icon
                        : `https:${h.icon}`
                    }
                    alt=""
                    className="w-12 h-12 mx-auto my-2"
                  />

                  <p className="text-xl font-bold text-gray-800">
                    {h.temp}°
                  </p>
                  <p className="text-sm text-blue-500">{h.wind} km/h</p>
                  <p className="text-sm text-blue-700 font-medium">
                    🌧️ {h.chance_of_rain}%
                  </p>{' '}
                  {/* <-- ADDED */}
                </div>
              ))}
            </div>
          </div>

          {/* DAILY FORECAST (MODIFIED) */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              3-Day Forecast
            </h3>

            <div className="divide-y divide-gray-100">
              {data.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {d.date}
                    </p>
                    <p className="text-gray-500">{d.condition}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      🌧️ {d.chance_of_rain}% Chance of Rain
                    </p>{' '}
                    {/* <-- ADDED */}
                  </div>

                  <div className="flex items-center gap-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        d.icon?.startsWith('http')
                          ? d.icon
                          : `https:${d.icon}`
                      }
                      alt=""
                      className="w-12 h-12"
                    />

                    <div className="text-right w-32">
                      <span className="text-xl font-bold text-gray-900">
                        {d.max_temp}°
                      </span>
                      <span className="text-gray-400 mx-2">/</span>
                      <span className="text-xl text-gray-500">
                        {d.min_temp}°
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHARTS */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Weather Charts
            </h3>

            <WeatherCharts
              hourly={data.hourly}
              daily={data.daily}
            />
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!data && !loading && (
        <p className="text-sm text-gray-500 mt-6">
          Search for a city to view weather details.
        </p>
      )}
    </div>
  );
}