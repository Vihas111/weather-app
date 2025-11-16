/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import AlertSidebar from '../components/AlertSidebar';
import * as SettingsContext from '../app/context/SettingsContext'; // Import to mock 'useSettings'
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

describe('AlertSidebar — Integration Test', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedFetch.mockClear();
    mockedUseSettings.mockClear();
    
    // Mock window.matchMedia for mobile detection
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

  it('renders full alert card structure when data arrives', async () => {
    // 1. Setup: Mock settings for one city (Mumbai)
    mockedUseSettings.mockReturnValue({
      settings: [
        { city: 'Mumbai', max_temp: 35, min_temp: -999, max_chance_of_rain: 60 },
      ],
      isLoading: false,
      saveSettings: jest.fn(),
    });

    // 2. Setup: Mock fetch to return weather that breaches BOTH thresholds
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temp_c: 40, // Breaches max_temp of 35
          chance_of_rain: 75, // Breaches max_chance_of_rain of 60
        },
      }),
    });

    // 3. Render
    render(<AlertSidebar />);

    // 4. Assert
    // Check city appears
    expect(await screen.findByText('Mumbai')).toBeInTheDocument();

    // Check that the new, specific breach text appears
    expect(
      await screen.findByText('Temp: 40° (Max: 35°)')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Rain: 75% (Max: 60%)')
    ).toBeInTheDocument();

    // Check that fetch was called correctly
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/weather?city=Mumbai',
      expect.anything()
    );
  });
});