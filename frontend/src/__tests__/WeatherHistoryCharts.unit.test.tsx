/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import WeatherHistoryCharts from "../components/WeatherHistoryCharts";
import "@testing-library/jest-dom";

jest.mock("react-chartjs-2", () => ({
  Line: jest.fn().mockImplementation(() => (
    <canvas data-testid="mock-chart" />
  )),
}));

const hourly = [
  { time: "10:00", temp: 28, wind: 12, humidity: 50 },
  { time: "11:00", temp: 29, wind: 14, humidity: 55 },
];

describe("WeatherHistoryCharts - Unit Tests", () => {
  it("renders all 3 hourly chart titles", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);

    expect(screen.getByText("Temperature (Hourly)")).toBeInTheDocument();
    expect(screen.getByText("Wind (Hourly)")).toBeInTheDocument();
    expect(screen.getByText("Humidity (Hourly)")).toBeInTheDocument();
  });
});
