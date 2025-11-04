// Mock Next.js server modules so they don't crash under Jest
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

(global as any).Request = class {};

import { GET } from './route'; // Import your API's GET function

/**
 * @jest-environment node
 */

describe('Weather API Route (GET)', () => {

  it('should return mock weather data for a valid city (london)', async () => {
    // 1. Create a mock request object
    const request = {} as Request;
    
    // 2. Create mock context, simulating that 'params' is a Promise
    const context = {
      params: Promise.resolve({ city: 'london' })
    };

    // 3. Call the GET function directly and await the result
    const response = await GET(request, context as any); // Use 'as any' to satisfy TypeScript
    
    // 4. Check the data
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.temperature).toBe(15);
    expect(data.condition).toBe('Cloudy');
  });

  it('should return a 404 error for an invalid city (neverland)', async () => {
    // 1. Create mock request and context
    const request = {} as Request;
    const context = {
      params: Promise.resolve({ city: 'neverland' })
    };

    // 2. Call the GET function
    const response = await GET(request, context as any);
    
    // 3. Check the error
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Weather data not found for neverland');
  });

});

