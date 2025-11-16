/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import WeatherHistoryCharts from "../components/WeatherHistoryCharts";
import "@testing-library/jest-dom";

jest.mock("react-chartjs-2", () => ({
  Line: jest.fn().mockImplementation(() => (
    <canvas data-testid="chart-export" />
  )),
}));

const hourly = [
  { time: "10:00", temp: 28, wind: 12, humidity: 50 },
  { time: "11:00", temp: 29, wind: 14, humidity: 55 },
];

describe("WeatherHistoryCharts Export - Integration Tests", () => {
  it("renders all charts", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    expect(screen.getAllByTestId("chart-export")).toHaveLength(3);
  });

  it("CSV export buttons exist and are clickable", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    const csvButtons = screen.getAllByText("Download CSV");
    fireEvent.click(csvButtons[0]);
  });

  it("Download ALL CSV works", () => {
    render(<WeatherHistoryCharts mode="hourly" data={hourly} city="Chennai" />);
    fireEvent.click(screen.getByText("Download ALL CSV"));
  });
});
