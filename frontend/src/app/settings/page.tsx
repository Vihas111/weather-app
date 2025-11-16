'use client';
import React, { useState } from 'react';
import Link from 'next/link';

// 1. Import our NEW hook and setting type
import { useSettings, ThresholdSetting } from '@/app/context/SettingsContext';

// This interface is for our form's local state
interface FormValues {
  city: string;
  maxTemp: string;
  minTemp: string;
  maxRain: string; // Changed from maxWind
}

export default function SettingsPage() {
  // 2. Get settings & save function from our context
  // No more isLoading, useEffect, or fetch!
  const { settings: allSettings, saveSettings } = useSettings();

  // 3. State for the form
  const [form, setForm] = useState<FormValues>({
    city: '',
    maxTemp: '',
    minTemp: '',
    maxRain: '',
  });
  const [message, setMessage] = useState('');

  // Helper to update the form
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // 4. Handle Save (Add or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cityName = form.city.trim();
    if (!cityName) {
      setMessage('City name is required.');
      return;
    }

    // Create the new setting object for our list
    const newSetting: ThresholdSetting = {
      city: cityName,
      // Use 999 / -999 as a default for "no limit" if blank
      max_temp: form.maxTemp === '' ? 999 : parseFloat(form.maxTemp),
      min_temp: form.minTemp === '' ? -999 : parseFloat(form.minTemp),
      max_chance_of_rain: form.maxRain === '' ? 999 : parseFloat(form.maxRain),
    };

    // Check if city exists to update it, otherwise add it
    const cityExists = allSettings.some(
      s => s.city.toLowerCase() === newSetting.city.toLowerCase()
    );

    let updatedList: ThresholdSetting[];
    if (cityExists) {
      // Create a new array, replacing the old item
      updatedList = allSettings.map(s =>
        s.city.toLowerCase() === newSetting.city.toLowerCase() ? newSetting : s
      );
    } else {
      // Create a new array with the new item at the end
      updatedList = [...allSettings, newSetting];
    }

    // 5. Save the new list to context & localStorage
    saveSettings(updatedList);

    setMessage(`Saved settings for ${cityName}.`);
    // Clear the form
    setForm({ city: '', maxTemp: '', minTemp: '', maxRain: '' });
  };

  // 6. Handle Delete
  const handleDelete = (cityName: string) => {
    if (!confirm(`Delete alert for ${cityName}?`)) return;

    // Create a new list *without* the deleted city
    const filteredList = allSettings.filter(
      s => s.city.toLowerCase() !== cityName.toLowerCase()
    );

    // 7. Save the new, smaller list
    saveSettings(filteredList);
    setMessage(`Deleted ${cityName}.`);
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
            Add a new city or update an existing one. Settings are saved to this
            device.
          </p>

          <input
            type="text"
            name="city" // Added name
            value={form.city}
            onChange={handleFormChange}
            placeholder="e.g. London"
            className="w-full p-3 border border-gray-300 rounded-lg text-black"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              name="maxTemp" // Added name
              value={form.maxTemp}
              onChange={handleFormChange}
              placeholder="Max Temp (°C)"
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
            />
            <input
              type="number"
              name="minTemp" // Added name
              value={form.minTemp}
              onChange={handleFormChange}
              placeholder="Min Temp (°C)"
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
            />
            {/* --- THIS BLOCK IS MODIFIED --- */}
            <input
              type="number"
              name="maxRain" // Changed name
              value={form.maxRain} // Changed value
              onChange={handleFormChange}
              placeholder="Max Rain (%)" // Changed placeholder
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
            />
            {/* --- END MODIFIED BLOCK --- */}
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

        {/* We use allSettings from our context now */}
        {allSettings.length === 0 ? (
          <p className="text-gray-500">No alerts configured.</p>
        ) : (
          allSettings.map((setting) => (
            <div
              key={setting.city}
              className="flex justify-between items-center py-4 border-b last:border-none"
            >
              <div>
                <h3 className="text-xl font-semibold">{setting.city}</h3>
                {/* --- THIS BLOCK IS MODIFIED --- */}
                <p className="text-gray-600 text-sm">
                  Max Temp: {setting.max_temp === 999 ? 'N/A' : `${setting.max_temp}°`}{' '}
                  | Min Temp:{' '}
                  {setting.min_temp === -999 ? 'N/A' : `${setting.min_temp}°`}{' '}
                  | Max Rain:{' '}
                  {setting.max_chance_of_rain === 999 ? 'N/A' : `${setting.max_chance_of_rain}%`}
                </p>
                {/* --- END MODIFIED BLOCK --- */}
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