/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../components/SearchBar';
import '@testing-library/jest-dom';

global.fetch = jest.fn();

describe('SearchBar Component', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the search bar and results container', () => {
    render(<SearchBar />);
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

    fireEvent.change(screen.getByPlaceholderText('Enter city name (e.g., london)'), {
      target: { value: 'london' },
    });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    const tempElements = await screen.findAllByText((_, el) => {
      const text = el?.textContent ?? '';
      return text.includes('Temperature:') && text.includes('15') && text.includes('°C');
    });
    expect(tempElements.length).toBeGreaterThan(0);

    const conditionElements = await screen.findAllByText((_, el) => {
      const text = el?.textContent ?? '';
      return text.includes('Condition:') && text.includes('Cloudy');
    });
    expect(conditionElements.length).toBeGreaterThan(0);
  });

  it('displays an error message if the city is not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Weather data not found for unknown' }),
    });

    render(<SearchBar />);

    fireEvent.change(screen.getByPlaceholderText('Enter city name (e.g., london)'), {
      target: { value: 'unknown' },
    });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    const errorElement = await screen.findByText(/Weather data not found for unknown/i);
    expect(errorElement).toBeInTheDocument();
  });
});
