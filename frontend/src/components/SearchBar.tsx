'use client'; // This must be a client component

import { useState } from 'react';
import { Search } from 'lucide-react'; // Import the search icon

// Define a type for our weather data (matches your SAD)
type WeatherData = {
  temperature: number;
  humidity: number;
  wind: number;
  condition: string;
};

export default function SearchBar() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!city) return; // Don't search for empty string

    setIsLoading(true);
    setError(null);
    setWeather(null);

    try {
      // Call our new Next.js API route
      const response = await fetch(`/api/weather/${city}`);
      
      // 1. First, check if the response was successful (e.g., 200 OK)
      if (!response.ok) {
        // If not, try to parse the error message from the body
        // This will handle our 404 JSON error: {"error": "..."}
        let errorData: { error?: string }; // Define type for errorData
        try {
          errorData = await response.json();
        } catch (_parseError) { // ✅ FIX: Prefixed unused var with _
          // If the error response itself isn't JSON, throw a generic error
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        // Throw the specific error message from our API
        throw new Error(errorData?.error || 'Something went wrong');
      }

      // 2. Only if the response.ok is true, do we parse the success JSON
      const data: WeatherData = await response.json();
      setWeather(data);

    } catch (err: unknown) { // ✅ FIX: Use 'unknown' instead of 'any'
      // ✅ Type guard
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* --- Search Input and Button --- */}
      <div className="flex rounded-lg shadow-md">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name (e.g., london)"
          className="flex-grow p-4 rounded-l-lg text-gray-800 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="flex-shrink-0 p-4 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400"
          aria-label="Search"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* --- Results Display --- */}
      <div className="mt-6 p-6 bg-white rounded-lg shadow-lg min-h-[100px]">
        {error && (
          <p className="text-red-500 text-center">{error}</p>
        )}
        {weather && (
          <div className="text-left text-gray-700">
            <h3 className="text-2xl font-bold mb-4 capitalize">{city}</h3>
            <p><strong>Temperature:</strong> {weather.temperature}°C</p>
            <p><strong>Condition:</strong> {weather.condition}</p>
            <p><strong>Humidity:</strong> {weather.humidity}%</p>
            <p><strong>Wind Speed:</strong> {weather.wind} km/h</p>
          </div>
        )}
        {!weather && !error && !isLoading && (
          <p className="text-gray-400 text-center">Search for a city to see results.</p>
        )}
      </div>
    </div>
  );
}