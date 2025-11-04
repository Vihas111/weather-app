// Mock Next.js server modules
jest.mock('next/server', () => ({
  NextResponse: {
    // ✅ FIX 1 & 2: Replaced 'any' with specific types for the mock
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

// ✅ FIX 3: Disable lint for this specific, necessary hack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Request = class {};

import { GET } from './route'; // Import your API's GET function

/**
 * @jest-environment node
 */

// ✅ FIX 4 & 5: Define a type for the context
type ApiContext = {
  params: Promise<{ city: string }>;
};

describe('Weather API Route (GET)', () => {

  it('should return mock weather data for a valid city (london)', async () => {
    // 1. Create a mock request object
    const request = {} as Request;
    
    // 2. Create mock context, using our new type
    const context: ApiContext = {
      params: Promise.resolve({ city: 'london' })
    };

    // 3. Call the GET function directly (no 'as any' needed)
    const response = await GET(request, context);
    
    // 4. Check the data
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.temperature).toBe(15);
    expect(data.condition).toBe('Cloudy');
  });

  it('should return a 404 error for an invalid city (neverland)', async () => {
    // 1. Create mock request and context
    const request = {} as Request;
    const context: ApiContext = {
      params: Promise.resolve({ city: 'neverland' })
    };

    // 2. Call the GET function (no 'as any' needed)
    const response = await GET(request, context);
    
    // 3. Check the error
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Weather data not found for neverland');
  });

});