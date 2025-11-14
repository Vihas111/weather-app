/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import WeatherCharts from "../components/WeatherCharts";
import "@testing-library/jest-dom";

// Mock jsPDF so PDF export doesn't crash
jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    text: jest.fn(),
    setFontSize: jest.fn(),
  }));
});

// Mock chart refs → toBase64Image
jest.mock("react-chartjs-2", () => ({
  Line: jest.fn().mockImplementation(({ ref }) => {
    if (ref) {
      ref.current = {
        toBase64Image: () => "data:image/png;base64,fakechart",
      };
    }
    return <canvas data-testid="mock-chart" />;
  }),
}));

const hourly = [
  { time: "10:00", temp: 20, wind: 5, icon: "" },
  { time: "11:00", temp: 22, wind: 6, icon: "" },
];

const daily = [
  { date: "2025-11-13", max_temp: 30, min_temp: 20, condition: "Sunny", icon: "" },
  { date: "2025-11-14", max_temp: 28, min_temp: 18, condition: "Cloudy", icon: "" },
];

describe("WeatherCharts - Unit Tests", () => {
  it("renders all chart titles", () => {
    render(<WeatherCharts hourly={hourly} daily={daily} />);

    expect(screen.getByText("Hourly Temperature")).toBeInTheDocument();
    expect(screen.getByText("Hourly Wind Speed")).toBeInTheDocument();
    expect(screen.getByText("3-Day Temperature Trend")).toBeInTheDocument();
  });

  it("renders export buttons for each chart", () => {
    render(<WeatherCharts hourly={hourly} daily={daily} />);

    expect(screen.getAllByText("PNG").length).toBe(3);
    expect(screen.getAllByText("PDF").length).toBe(3);
  });

  it("renders the 'Download All Charts (PDF)' button", () => {
    render(<WeatherCharts hourly={hourly} daily={daily} />);

    expect(
      screen.getByText("📥 Download All Charts (PDF)")
    ).toBeInTheDocument();
  });

  it("clicking PNG button should NOT crash", () => {
    render(<WeatherCharts hourly={hourly} daily={daily} />);
    const pngBtn = screen.getAllByText("PNG")[0];
    fireEvent.click(pngBtn);
  });

  it("clicking PDF button should NOT crash", () => {
    render(<WeatherCharts hourly={hourly} daily={daily} />);
    const pdfBtn = screen.getAllByText("PDF")[0];
    fireEvent.click(pdfBtn);
  });
});
