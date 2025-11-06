import { NextResponse } from 'next/server';
// --- NEW: Import File System (fs) and path ---
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// --- NEW: Define Cache settings ---
// This creates a 'cache.json' file in your project's root
const CACHE_FILE_PATH = path.resolve(process.cwd(), 'cache.json');
// Cache Time-to-Live: 1 hour (in milliseconds)
const CACHE_TTL = 60 * 60 * 1000; 

type WeatherData = {
  temperature: number;
  humidity: number;
  wind: number;
  condition: string;
};

// --- NEW: Define Cache Structure ---
type CacheEntry = {
  data: WeatherData;
  timestamp: number;
};

type Cache = {
  [city: string]: CacheEntry;
};
// --- END NEW ---

/**
 * Helper function to read the cache
 */
async function readCache(): Promise<Cache> {
  try {
    const data = await readFile(CACHE_FILE_PATH, 'utf-8');
    return JSON.parse(data) as Cache;
  } catch (error) {
    // If file doesn't exist or is empty, return empty cache
    return {};
  }
}

/**
 * Helper function to write to the cache
 */
async function writeCache(cache: Cache) {
  try {
    await writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write cache:', error);
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await context.params;
    const normalizedCity = city.toLowerCase();

    // --- NEW CACHE LOGIC ---
    // 1. Read from cache
    const cache = await readCache();
    const cachedEntry = cache[normalizedCity];

    // 2. Check if cache is fresh (Cache Hit)
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
      return NextResponse.json(cachedEntry.data, { status: 200 });
    }
    // --- END NEW CACHE LOGIC ---

    // CACHE MISS or STALE
    // This part is our "External API"
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
      // --- NEW: Write to cache before returning ---
      cache[normalizedCity] = {
        data: weatherData,
        timestamp: Date.now(),
      };
      await writeCache(cache);
      // --- END NEW ---
      
      return NextResponse.json(weatherData, { status: 200 });
    } else {
      // Line 40 (from your log) is this block
      return NextResponse.json(
        { error: `Weather data not found for ${normalizedCity}` },
        { status: 404 }
      );
    }
  } catch (error) {
    // Line 55 (from your log) is this block
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}