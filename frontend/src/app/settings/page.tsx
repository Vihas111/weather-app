'use client';
import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

// Define the shape of a single setting
interface CityAlertSetting {
  city: string;
  max_temp: number | null;
  min_temp: number | null;
  max_wind_kph: number | null;
}

export default function SettingsPage() {
  // --- State for the "Add New" form ---
  const [city, setCity] = useState('');
  const [maxTemp, setMaxTemp] = useState('');
  const [minTemp, setMinTemp] = useState('');
  const [maxWind, setMaxWind] = useState('');

  // --- State for the list of existing settings ---
  const [allSettings, setAllSettings] = useState<CityAlertSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';

  // --- Function to load all settings (stable reference) ---
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/settings`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data: CityAlertSetting[] = await res.json();
      setAllSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage('Error: Could not load settings.');
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  // Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, [loadSettings]); // stable dependency

  // --- Handle ADD or UPDATE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      setMessage('City name is required.');
      return;
    }
    setMessage('Saving...');

    const newSetting: CityAlertSetting = {
      city: city.trim(),
      max_temp: maxTemp === '' ? null : parseFloat(maxTemp),
      min_temp: minTemp === '' ? null : parseFloat(minTemp),
      max_wind_kph: maxWind === '' ? null : parseFloat(maxWind),
    };

    try {
      const res = await fetch(`${backendUrl}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetting),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to save setting');
      }

      setMessage(`Setting for ${newSetting.city} saved!`);
      // Clear the form
      setCity('');
      setMaxTemp('');
      setMinTemp('');
      setMaxWind('');
      // Refresh the list
      await loadSettings();
    } catch (error) {
      console.error('Failed to save setting:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Error: ${errMsg}`);
    }
  };

  // --- Handle DELETE ---
  const handleDelete = async (cityName: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete the alert for ${cityName}?`)) {
      return;
    }
    setMessage(`Deleting ${cityName}...`);
    try {
      const res = await fetch(`${backendUrl}/settings/${encodeURIComponent(cityName)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`Failed to delete. Status: ${res.status}`);
      }

      setMessage(`Alert for ${cityName} deleted.`);
      // Refresh the list
      await loadSettings();
    } catch (error) {
      console.error('Failed to delete setting:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Error: ${errMsg}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* --- Card 1: Add/Update Form --- */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Alert Settings</h1>
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors" title="Back to Home">
            <span className="text-3xl">🏠</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Add a new city to monitor, or update an existing one by re-adding it.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City Name (Required):
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. London"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Temp (°C):
              </label>
              <input
                type="number"
                value={maxTemp}
                onChange={(e) => setMaxTemp(e.target.value)}
                placeholder="e.g. 35"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Temp (°C):
              </label>
              <input
                type="number"
                value={minTemp}
                onChange={(e) => setMinTemp(e.target.value)}
                placeholder="e.g. 0"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Wind (kph):
              </label>
              <input
                type="number"
                value={maxWind}
                onChange={(e) => setMaxWind(e.target.value)}
                placeholder="e.g. 60"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
          </div>

          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 w-full mt-2">
            Save City Setting
          </button>

          {message && <p className="text-gray-600 mt-4 text-center">{message}</p>}
        </form>
      </div>

      {/* --- Card 2: List of Current Alerts --- */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Alerts</h2>
        {isLoading ? (
          <div>Loading alerts...</div>
        ) : allSettings.length === 0 ? (
          <p className="text-gray-500">No alerts configured. Add one above to get started.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {allSettings.map((setting) => (
              <div key={setting.city} className="flex justify-between items-center py-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{setting.city}</h3>
                  <div className="flex gap-4 text-gray-600 text-sm mt-1">
                    <span>Max Temp: {setting.max_temp ?? 'N/A'}°</span>
                    <span>Min Temp: {setting.min_temp ?? 'N/A'}°</span>
                    <span>Max Wind: {setting.max_wind_kph ?? 'N/A'} kph</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(setting.city)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
