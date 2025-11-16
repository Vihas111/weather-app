'use client';
import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

interface CityAlertSetting {
  city: string;
  max_temp: number | null;
  min_temp: number | null;
  max_wind_kph: number | null;
}

export default function SettingsPage() {
  const [city, setCity] = useState('');
  const [maxTemp, setMaxTemp] = useState('');
  const [minTemp, setMinTemp] = useState('');
  const [maxWind, setMaxWind] = useState('');
  const [allSettings, setAllSettings] = useState<CityAlertSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const backendUrl =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/settings`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setAllSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage('Error: Could not load settings.');
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save or update a city
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cityName = city.trim();
    if (!cityName) {
      setMessage('City name is required.');
      return;
    }

    const newSetting = {
      max_temp: maxTemp === '' ? null : parseFloat(maxTemp),
      min_temp: minTemp === '' ? null : parseFloat(minTemp),
      max_wind_kph: maxWind === '' ? null : parseFloat(maxWind), // FIXED
    };

    try {
      const res = await fetch(`${backendUrl}/settings/${cityName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetting),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
        throw new Error('Failed to save setting');
      }

      setMessage(`Saved settings for ${cityName}.`);

      setCity('');
      setMaxTemp('');
      setMinTemp('');
      setMaxWind('');

      loadSettings();
    } catch (error) {
      console.error(error);
      setMessage('Error saving setting.');
    }
  };

  // Delete a city alert
  const handleDelete = async (cityName: string) => {
    if (!confirm(`Delete alert for ${cityName}?`)) return;

    try {
      await fetch(`${backendUrl}/settings/${cityName}`, {
        method: 'DELETE',
      });

      setMessage(`Deleted ${cityName}.`);
      loadSettings();
    } catch {
      setMessage('Error deleting.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* Add / Update */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Alert Settings</h1>
          <Link href="/" className="text-gray-500 hover:text-blue-600">
            <span className="text-3xl">🏠</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Add a new city or update an existing one.
          </p>

          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. London"
            className="w-full p-3 border border-gray-300 rounded-lg text-black"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              value={maxTemp}
              onChange={(e) => setMaxTemp(e.target.value)}
              placeholder="Max Temp (°C)"
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
            />
            <input
              type="number"
              value={minTemp}
              onChange={(e) => setMinTemp(e.target.value)}
              placeholder="Min Temp (°C)"
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
            />
            <input
              type="number"
              value={maxWind}
              onChange={(e) => setMaxWind(e.target.value)}
              placeholder="Max Wind (kph)"
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
            />
          </div>

          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
            Save City Setting
          </button>

          {message && (
            <p className="text-gray-600 mt-3 text-center">{message}</p>
          )}
        </form>
      </div>

      {/* Display Settings */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Current Alerts
        </h2>

        {isLoading ? (
          <p>Loading...</p>
        ) : allSettings.length === 0 ? (
          <p className="text-gray-500">No alerts configured.</p>
        ) : (
          allSettings.map((setting) => (
            <div
              key={setting.city}
              className="flex justify-between items-center py-4 border-b last:border-none"
            >
              <div>
                <h3 className="text-xl font-semibold">{setting.city}</h3>
                <p className="text-gray-600 text-sm">
                  Max Temp: {setting.max_temp ?? 'N/A'}° | Min Temp:{' '}
                  {setting.min_temp ?? 'N/A'}° | Max Wind:{' '}
                  {setting.max_wind_kph ?? 'N/A'} kph
                </p>
              </div>
              <button
                onClick={() => handleDelete(setting.city)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
