// ✅ LINT FIX: Use 'import' instead of 'require'
import { readFile, writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';

// Mock Next.js server modules
jest.mock('next/server', () => ({
  NextResponse: {
    // ✅ LINT FIX: Replaced 'any' with specific types
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

// ✅ LINT FIX: Disable 'any' rule for this necessary polyfill
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Request = class {};

// We must import GET *after* the mocks are defined
import { GET } from './route';

/**
 * @jest-environment node
 */

// Mock the 'fs/promises' module (the file system)
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// ✅ LINT FIX: Cast the imported functions to mocks
const mockedReadFile = readFile as jest.Mock;
const mockedWriteFile = writeFile as jest.Mock;

// ✅ LINT FIX: Define a type for the context
type ApiContext = {
  params: Promise<{ city: string }>;
};

describe('Weather API Route (GET)', () => {

  // Reset all mock functions before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return mock data and write to cache on a (Cache Miss)', async () => {
    // 1. Simulate an empty cache file
    mockedReadFile.mockResolvedValue('{}');

    // 2. Create mock request and context
    const request = {} as Request;
    const context: ApiContext = {
      params: Promise.resolve({ city: 'london' }),
    };

    // 3. Call the GET function
    const response = await GET(request, context);
    const data = await response.json();

    // 4. Check that it returned the correct data
    expect(response.status).toBe(200);
    expect(data.temperature).toBe(15);

    // 5. Check that it WROTE to the cache
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
  });

  it('should return data from the cache on a (Cache Hit)', async () => {
    // 1. Simulate a cache file that has FRESH data
    const freshCacheData = {
      london: { data: { temperature: 99, condition: 'From Cache' }, timestamp: Date.now() },
    };
    mockedReadFile.mockResolvedValue(JSON.stringify(freshCacheData));

    // 2. Make the request
    const request = {} as Request;
    const context: ApiContext = {
      params: Promise.resolve({ city: 'london' }),
    };
    const response = await GET(request, context);
    const data = await response.json();

    // 3. Check that it returned the CACHED data
    expect(response.status).toBe(200);
    expect(data.temperature).toBe(99);

    // 4. Check that it did NOT write
    expect(mockedWriteFile).toHaveBeenCalledTimes(0);
  });

  it('should fetch new data if the cache is stale (Cache Stale)', async () => {
    // 1. Simulate a cache file that has OLD (stale) data
    const staleCacheData = {
      london: { data: { temperature: 99 }, timestamp: Date.now() - 2 * 60 * 60 * 1000 },
    };
    mockedReadFile.mockResolvedValue(JSON.stringify(staleCacheData));

    // 2. Make the request
    const request = {} as Request;
    const context: ApiContext = {
      params: Promise.resolve({ city: 'london' }),
    };
    const response = await GET(request, context);
    const data = await response.json();

    // 3. Check that it returned NEW data
    expect(response.status).toBe(200);
    expect(data.temperature).toBe(15); // This is from the mock DB

    // 4. Check that it READ, then WROTE
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
  });

  it('should return a 404 for an invalid city (and not cache it)', async () => {
    // 1. Simulate an empty cache
    mockedReadFile.mockResolvedValue('{}');

    // 2. Make the request
    const request = {} as Request;
    const context: ApiContext = {
      params: Promise.resolve({ city: 'neverland' }),
    };

    // 3. Call the GET function
    const response = await GET(request, context);
    const data = await response.json();

    // 4. Check the error
    expect(response.status).toBe(404);
    
    // 5. Check that it did NOT write
    expect(mockedWriteFile).toHaveBeenCalledTimes(0);
  });
});