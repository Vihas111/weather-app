'use client';

import React, { useState } from 'react';
import { Cloud, Sun } from 'lucide-react';

export default function WeatherApp() {
  const [selectedCity] = useState('San Francisco');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <Cloud className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Weather Prediction App</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{selectedCity}</h2>
          <p className="text-gray-600 mt-2">Weather information and forecasts</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center py-12">
            <Sun className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Weather App Coming Soon!
            </h3>
            <p className="text-gray-600"></p>
          </div>
        </div>
      </main>
    </div>
  );
}
