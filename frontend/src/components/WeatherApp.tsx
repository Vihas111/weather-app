'use client';

import React, { useState } from 'react';
import { Cloud, Sun } from 'lucide-react';

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
  current: { temp: number; condition: string; icon: string; humidity: number; wind: number };
  hourly: Hour[];
  daily: Day[];
  backend_duration_ms?: number;
};

export default function WeatherApp() {
  const [city, setCity] = useState('San Francisco');
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // use env var if provided (nice for deployment); otherwise assume localhost:4000
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

  async function fetchWeather(forCity: string) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const url = `${API_BASE.replace(/\/$/, '')}/weather?city=${encodeURIComponent(forCity)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
      }
      const json: WeatherData = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // initial fetch for the default city
  React.useEffect(() => {
    // don't wait if you don't want to auto-fetch; comment out line below if not needed
    fetchWeather(city);
  }, []); // empty deps => run once on mount

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cloud className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Weather Prediction App</h1>
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
              {loading ? 'Loading...' : 'Search'}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!data && !error && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center py-12">
              <Sun className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Weather App</h3>
              <p className="text-gray-600">Search a city and view current, hourly and 3-day forecast.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error}</div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Top card */}
            <div className="bg-white p-8 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-4xl font-bold text-gray-900">{data.location.city}</h2>
                <p className="text-gray-500 text-lg">{data.location.region}</p>

                <div className="mt-4 flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-bold text-gray-800">{data.current.temp}°</span>
                    {/* using plain img with protocol fixed */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https:${data.current.icon}`} alt="weather icon" className="w-20 h-20" />
                  </div>
                  <div>
                    <p className="text-xl text-blue-600 mt-2">{data.current.condition}</p>
                    <p className="text-sm text-gray-600">Humidity: {data.current.humidity}%</p>
                    <p className="text-sm text-gray-600">Wind: {data.current.wind} km/h</p>
                    {typeof data.backend_duration_ms === 'number' && (
                      <p className="text-xs text-gray-500 mt-2">
                        Backend: <strong>{data.backend_duration_ms} ms</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">Data source: backend</p>
                <p className="text-sm text-gray-500">Updated: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Hourly */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Today&apos;s Forecast</h3>
              <div className="flex overflow-x-auto gap-4 pb-2">
                {data.hourly.map((h, i) => (
                  <div key={i} className="min-w-[110px] bg-blue-50 p-4 rounded-lg text-center shrink-0">
                    <p className="text-gray-600 font-medium">{h.time}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https:${h.icon}`} alt="icon" className="w-12 h-12 mx-auto my-2" />
                    <p className="text-xl font-bold text-gray-800">{h.temp}°</p>
                    <p className="text-sm text-blue-500">{h.wind} km/h</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">3-Day Forecast</h3>
              <div className="divide-y divide-gray-100">
                {data.daily.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{d.date}</p>
                      <p className="text-gray-500">{d.condition}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https:${d.icon}`} alt="icon" className="w-12 h-12" />
                      <div className="text-right w-32">
                        <span className="text-xl font-bold text-gray-900">{d.max_temp}°</span>
                        <span className="text-gray-400 mx-2">/</span>
                        <span className="text-xl text-gray-500">{d.min_temp}°</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
