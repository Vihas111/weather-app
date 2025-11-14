/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import WeatherCharts from '../components/WeatherCharts';
import '@testing-library/jest-dom';

// Mock Chart.js since we don't need real canvas rendering
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />
}));

describe('WeatherCharts - Unit Tests', () => {
  const mockHourly = [
    { time: "10:00", temp: 20, wind: 5, icon: "" },
    { time: "11:00", temp: 22, wind: 6, icon: "" },
  ];

  const mockDaily = [
    { date: "2025-11-13", max_temp: 30, min_temp: 20, condition: "Sunny", icon: "" },
    { date: "2025-11-14", max_temp: 28, min_temp: 18, condition: "Cloudy", icon: "" },
  ];

  it("renders temperature chart", () => {
    render(<WeatherCharts hourly={mockHourly} daily={mockDaily} />);

    expect(screen.getByText("Hourly Temperature")).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-line-chart").length).toBeGreaterThan(0);
  });

  it("renders wind speed chart", () => {
    render(<WeatherCharts hourly={mockHourly} daily={mockDaily} />);

    expect(screen.getByText("Hourly Wind Speed")).toBeInTheDocument();
  });

  it("renders daily trend chart", () => {
    render(<WeatherCharts hourly={mockHourly} daily={mockDaily} />);

    expect(screen.getByText("3-Day Temperature Trend")).toBeInTheDocument();
  });
});
