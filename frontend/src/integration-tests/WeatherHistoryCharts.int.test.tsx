/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import WeatherHistoryCharts from "../components/WeatherHistoryCharts";
import "@testing-library/jest-dom";

jest.mock("react-chartjs-2", () => ({
  Line: jest.fn().mockImplementation(() => (
    <canvas data-testid="chart-canvas" />
  )),
}));

const hourly = [
  { time: "10:00", temp: 28, wind: 12, humidity: 50 },
  { time: "11:00", temp: 29, wind: 14, humidity: 55 },
];

describe("WeatherHistoryCharts - Integration Tests", () => {
  it("renders 3 chart canvases", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    expect(screen.getAllByTestId("chart-canvas")).toHaveLength(3);
  });
});
