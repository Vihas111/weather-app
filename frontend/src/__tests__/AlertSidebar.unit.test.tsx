/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AlertSidebar from '../components/AlertSidebar';
import * as SettingsContext from '../app/context/SettingsContext'; // Import context to mock 'useSettings'
import '@testing-library/jest-dom';

// Mock the useSettings hook
jest.mock('../app/context/SettingsContext', () => ({
  __esModule: true,
  ...jest.requireActual('../app/context/SettingsContext'), // Import and retain original non-hook parts
  useSettings: jest.fn(), // Mock the hook itself
}));

// Cast the mock so we can control it in each test
const mockedUseSettings = SettingsContext.useSettings as jest.Mock;

// Mock global.fetch
global.fetch = jest.fn();
const mockedFetch = global.fetch as jest.Mock;

describe('AlertSidebar — Unit Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedFetch.mockClear();
    mockedUseSettings.mockClear();
    
    // Mock window.matchMedia for mobile detection (prevents unrelated errors)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('shows friendly message when settings are loading', async () => {
    // 1. Setup: Mock useSettings to be in a loading state
    mockedUseSettings.mockReturnValue({
      settings: [],
      isLoading: true, // <-- Loading
      saveSettings: jest.fn(),
    });

    // 2. Render
    const { container } = render(<AlertSidebar />);

    // 3. Assert
    // When loading, the component returns null, so it should be empty
    expect(container.childElementCount).toBe(0);
  });

  it('shows friendly message when no settings are configured', async () => {
    // 1. Setup: Mock useSettings to return an empty settings list
    mockedUseSettings.mockReturnValue({
      settings: [], // <-- No settings
      isLoading: false,
      saveSettings: jest.fn(),
    });

    // 2. Render
    render(<AlertSidebar />);

    // 3. Assert
    // We wait for the "No alerts" message to appear
    expect(
      await screen.findByText('No extreme weather alerts 😊')
    ).toBeInTheDocument();
    // It should not fetch anything if there are no settings
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('fetches weather but shows friendly message if no thresholds are breached', async () => {
    // 1. Setup: Mock settings for one city
    mockedUseSettings.mockReturnValue({
      settings: [
        { city: 'London', max_temp: 30, min_temp: 0, max_chance_of_rain: 50 },
      ],
      isLoading: false,
      saveSettings: jest.fn(),
    });

    // 2. Setup: Mock fetch to return weather that does NOT breach thresholds
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temp_c: 25, chance_of_rain: 10 }, // No breach
      }),
    });

    // 3. Render
    render(<AlertSidebar />);

    // 4. Assert
    // It should still show the "No alerts" message
    expect(
      await screen.findByText('No extreme weather alerts 😊')
    ).toBeInTheDocument();
    // But it SHOULD have called fetch
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/weather?city=London',
      expect.anything()
    );
  });

  it('renders alert cities and specific breach conditions', async () => {
    // 1. Setup: Mock settings for two cities
    mockedUseSettings.mockReturnValue({
      settings: [
        { city: 'Bangalore', max_temp: 30, min_temp: -999, max_chance_of_rain: 999 },
        { city: 'Chennai', max_temp: 999, min_temp: -999, max_chance_of_rain: 50 },
      ],
      isLoading: false,
      saveSettings: jest.fn(),
    });

    // 2. Setup: Mock fetch to return different breaches for each city
    mockedFetch.mockImplementation((url: string) => {
      if (url.includes('Bangalore')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            current: { temp_c: 35, chance_of_rain: 10 }, // Breaches max_temp
          }),
        });
      }
      if (url.includes('Chennai')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            current: { temp_c: 28, chance_of_rain: 60 }, // Breaches max_chance_of_rain
          }),
        });
      }
      return Promise.reject(new Error('Unknown city'));
    });

    // 3. Render
    render(<AlertSidebar />);

    // 4. Assert
    // Check that the city names are rendered
    expect(await screen.findByText('Bangalore')).toBeInTheDocument();
    expect(await screen.findByText('Chennai')).toBeInTheDocument();

    // Check that the *specific breach text* is rendered
    expect(
      await screen.findByText('Temp: 35° (Max: 30°)')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Rain: 60% (Max: 50%)')
    ).toBeInTheDocument();

    // Check that fetch was called for both cities
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});