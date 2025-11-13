'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ErrorBanner from '@/components/ErrorBanner';
import WeatherCharts from '@/components/WeatherCharts';

// --- Weather data type ---
interface WeatherData {
  location: {
    city: string;
    region: string;
  };
  current: {
    temp: number;
    condition: string;
    icon: string;
    humidity: number;
    wind: number;
  };
  hourly: Array<{
    time: string;
    temp: number;
    icon: string;
    wind: number;
  }>;
  daily: Array<{
    date: string;
    max_temp: number;
    min_temp: number;
    condition: string;
    icon: string;
  }>;
  backend_duration_ms?: number;
}

// --- Alert breach type ---
interface AlertBreach {
  city: string;
  reason: string;
  value: number;
  threshold: number;
}

export default function HomePage() {
  const [city, setCity] = useState('');
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertBreaches, setAlertBreaches] = useState<AlertBreach[]>([]);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!city.trim()) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const url = `${API_BASE.replace(/\/$/, '')}/weather?city=${encodeURIComponent(
        city.trim()
      )}`;

      const res = await fetch(url);

      if (!res.ok) {
        // graceful error message for WeatherAPI 400/404
        let finalMessage = 'Invalid city';

        try {
          const json = await res.json();
          const detail = json.detail;

          if (detail) {
            const parsed =
              typeof detail === 'string' ? JSON.parse(detail) : detail;

            if (parsed?.error?.message) {
              finalMessage = `Invalid city: ${parsed.error.message}`;
            }
          }
        } catch {
          finalMessage = `Invalid city (API error ${res.status})`;
        }

        throw new Error(finalMessage);
      }

      const weatherData = (await res.json()) as WeatherData;
      setData(weatherData);

      // Fetch current alert breaches
      try {
        const alertRes = await fetch(
          `${API_BASE.replace(/\/$/, '')}/alerts/status`
        );
        const alertJson = await alertRes.json();

        if (Array.isArray(alertJson.breaches)) {
          setAlertBreaches(alertJson.breaches as AlertBreach[]);
        } else {
          setAlertBreaches([]);
        }
      } catch {
        console.error('Failed to fetch alerts');
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Determine if searched city is under alert
  const cityUnderAlert = alertBreaches.some(
    (b) =>
      data?.location.city &&
      b.city.toLowerCase() === data.location.city.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* MAIN SEARCH CARD */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Nimbus Weather</h1>

          <Link
            href="/settings"
            className="text-gray-500 hover:text-blue-600 transition-colors"
          >
            <span className="text-3xl">⚙️</span>
          </Link>
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
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* ERROR BANNER */}
        {error && <ErrorBanner message={error} />}
      </div>

      {/* WEATHER DETAILS */}
      {data && (
        <div className="w-full max-w-3xl space-y-6">
          {/* CURRENT WEATHER CARD */}
          <div
            className={`p-8 rounded-xl shadow-md flex justify-between items-center transition-all ${
              cityUnderAlert
                ? 'bg-red-50 border border-red-300'
                : 'bg-white'
            }`}
          >
            <div>
              <h2 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                {data.location.city}

                {cityUnderAlert && (
                  <span className="text-red-600 text-lg font-semibold">
                    ⚠️ Alert Active
                  </span>
                )}
              </h2>

              <p className="text-gray-500 text-lg">{data.location.region}</p>

              <div className="mt-4 flex items-center gap-4">
                <span className="text-7xl font-bold text-gray-800">
                  {data.current.temp}°
                </span>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    data.current.icon.startsWith('http')
                      ? data.current.icon
                      : `https:${data.current.icon}`
                  }
                  alt="weather icon"
                  className="w-20 h-20"
                />
              </div>

              <p className="text-xl text-blue-600 mt-2">
                {data.current.condition}
              </p>
            </div>

            <div className="text-right space-y-3 text-gray-700 text-lg">
              <p>
                💧 Humidity: <strong>{data.current.humidity}%</strong>
              </p>
              <p>
                💨 Wind: <strong>{data.current.wind} km/h</strong>
              </p>

              {typeof data.backend_duration_ms === 'number' && (
                <p className="text-sm text-gray-500">
                  Backend:{' '}
                  <strong>{data.backend_duration_ms} ms</strong>
                </p>
              )}
            </div>
          </div>

          {/* HOURLY FORECAST */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Today&apos;s Forecast</h3>

            <div className="flex overflow-x-auto gap-4 pb-2">
              {data.hourly.map((h) => (
                <div
                  key={h.time}
                  className="min-w-[110px] bg-blue-50 p-4 rounded-lg text-center"
                >
                  <p className="text-gray-600 font-medium">{h.time}</p>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={h.icon.startsWith('http') ? h.icon : `https:${h.icon}`}
                    alt="icon"
                    className="w-12 h-12 mx-auto my-2"
                  />

                  <p className="text-xl font-bold text-gray-800">
                    {h.temp}°
                  </p>

                  <p className="text-sm text-blue-500">{h.wind} km/h</p>
                </div>
              ))}
            </div>
          </div>

          {/* DAILY FORECAST */}
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
                  </div>

                  <div className="flex items-center gap-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.icon.startsWith('http') ? d.icon : `https:${d.icon}`}
                      alt="icon"
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

            <WeatherCharts hourly={data.hourly} daily={data.daily} />
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
