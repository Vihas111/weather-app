import { NextResponse } from 'next/server';

// ✅ DEFINE A TYPE for our mock data (Fixes 'no-explicit-any')
type WeatherData = {
  temperature: number;
  humidity: number;
  wind: number;
  condition: string;
};

/**
 * Mock weather API route (Next.js App Router compatible)
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ city: string }> } // <- params is a Promise
) {
  // ✅ Await the promise before accessing
  const { city } = await context.params;
  const normalizedCity = city.toLowerCase();

  // --- MOCK DATA ---
  // ✅ USE THE TYPE we just defined
  const mockDatabase: Record<string, WeatherData> = {
    london: {
      temperature: 15,
      humidity: 70,
      wind: 10,
      condition: 'Cloudy',
    },
    bengaluru: {
      temperature: 28,
      humidity: 60,
      wind: 15,
      condition: 'Sunny',
    },
  };

  const weatherData = mockDatabase[normalizedCity];

  if (weatherData) {
    return NextResponse.json(weatherData, { status: 200 });
  } else {
    return NextResponse.json(
      { error: `Weather data not found for ${normalizedCity}` },
      { status: 404 }
    );
  }
}