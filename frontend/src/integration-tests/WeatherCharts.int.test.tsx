/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import WeatherCharts from "../components/WeatherCharts";
import "@testing-library/jest-dom";

// Mock chart rendering
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="chart-render" />
}));

describe("WeatherCharts - Integration Tests", () => {
  const hourly = [
    { time: "10:00", temp: 21, wind: 7, icon: "" },
    { time: "11:00", temp: 23, wind: 8, icon: "" },
  ];

  const daily = [
    { date: "2025-11-13", max_temp: 29, min_temp: 19, condition: "Sunny", icon: "" },
    { date: "2025-11-14", max_temp: 27, min_temp: 17, condition: "Rainy", icon: "" }
  ];

  it("renders all charts successfully", () => {
    render(<WeatherCharts hourly={hourly} daily={daily} />);

    expect(screen.getByText("Hourly Temperature")).toBeInTheDocument();
    expect(screen.getByText("Hourly Wind Speed")).toBeInTheDocument();
    expect(screen.getByText("3-Day Temperature Trend")).toBeInTheDocument();

    expect(screen.getAllByTestId("chart-render").length).toBe(3);
  });
});
