/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import WeatherHistoryCharts from "../components/WeatherHistoryCharts";
import "@testing-library/jest-dom";

// mock chart.js canvases
jest.mock("react-chartjs-2", () => ({
  Line: jest.fn().mockImplementation(() => (
    <canvas data-testid="mock-chart" />
  )),
}));

const hourly = [
  { time: "10:00", temp: 28, wind: 12, humidity: 50 },
  { time: "11:00", temp: 29, wind: 14, humidity: 55 },
];

describe("WeatherHistoryCharts Export - Unit Tests", () => {
  it("renders CSV export buttons", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    expect(screen.getAllByText("Download CSV")).toHaveLength(3);
  });

  it("does not render PNG or PDF buttons", () => {
    expect(screen.queryByText("PNG")).toBeNull();
    expect(screen.queryByText("PDF")).toBeNull();
  });

  it("renders Download ALL CSV", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    expect(screen.getByText("Download ALL CSV")).toBeInTheDocument();
  });

  it("Download ALL CSV button is clickable", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    fireEvent.click(screen.getByText("Download ALL CSV"));
  });
});
