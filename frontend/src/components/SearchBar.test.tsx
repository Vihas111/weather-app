/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from './SearchBar'; // Import your component
import '@testing-library/jest-dom';

// Mock the global fetch function
global.fetch = jest.fn();

describe('SearchBar Component', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the search bar and results container', () => {
    render(<SearchBar />);
    
    // Check if the input and button are there
    expect(screen.getByPlaceholderText('Enter city name (e.g., london)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('fetches and displays weather data on search', async () => {
    const mockWeather = {
      temperature: 15,
      humidity: 70,
      wind: 10,
      condition: 'Cloudy',
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeather,
    });

    render(<SearchBar />);

    const input = screen.getByPlaceholderText('Enter city name (e.g., london)');
    fireEvent.change(input, { target: { value: 'london' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    // Wait for at least one "Temperature" line to appear
    const tempElements = await screen.findAllByText((_, element) => {
      const text = element?.textContent ?? '';
      return text.includes('Temperature:') && text.includes('15') && text.includes('°C');
    });
    expect(tempElements.length).toBeGreaterThan(0);

    // Check that the condition text appears
    const conditionElements = await screen.findAllByText((_, element) => {
      const text = element?.textContent ?? '';
      return text.includes('Condition:') && text.includes('Cloudy');
    });
    expect(conditionElements.length).toBeGreaterThan(0);
  });




  it('displays an error message if the city is not found', async () => {
    // 1. Setup the mock 404 response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Weather data not found for unknown' }),
    });

    // 2. Render and interact
    render(<SearchBar />);
    fireEvent.change(screen.getByPlaceholderText('Enter city name (e.g., london)'), {
      target: { value: 'unknown' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    // 3. Wait for and check for the error message

    // --- THIS IS THE FIX ---
    // We removed "Error:" from the text we are looking for.
    const errorElement = await screen.findByText(/Weather data not found for unknown/i);
    expect(errorElement).toBeInTheDocument();
  });
});