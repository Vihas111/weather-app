/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import WeatherCharts from "../components/WeatherCharts";
import "@testing-library/jest-dom";

// Mock jsPDF
jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    text: jest.fn(),
    setFontSize: jest.fn(),
  }));
});

// Mock chart canvas
jest.mock("react-chartjs-2", () => ({
  Line: jest.fn().mockImplementation(({ ref }) => {
    if (ref) {
      ref.current = {
        toBase64Image: () => "data:image/png;base64,fakechart",
      };
    }
    return <canvas data-testid="chart-canvas" />;
  }),
}));

const mockHourly = [
  { time: "10:00", temp: 20, wind: 5, icon: "" },
  { time: "11:00", temp: 22, wind: 6, icon: "" },
];

const mockDaily = [
  { date: "2025-11-13", max_temp: 30, min_temp: 20, condition: "Sunny", icon: "" },
  { date: "2025-11-14", max_temp: 28, min_temp: 18, condition: "Cloudy", icon: "" },
];

describe("WeatherCharts - Integration Tests", () => {
  it("renders all charts", () => {
    render(<WeatherCharts hourly={mockHourly} daily={mockDaily} />);
    expect(screen.getAllByTestId("chart-canvas").length).toBe(3);
  });

  it("Download All PDF button works", () => {
    render(<WeatherCharts hourly={mockHourly} daily={mockDaily} />);
    const btn = screen.getByText("📥 Download All Charts (PDF)");

    fireEvent.click(btn); // Should not throw
  });

  it("individual chart export buttons work", () => {
    render(<WeatherCharts hourly={mockHourly} daily={mockDaily} />);

    const pngButtons = screen.getAllByText("PNG");
    const pdfButtons = screen.getAllByText("PDF");

    fireEvent.click(pngButtons[0]);
    fireEvent.click(pdfButtons[0]);
  });
});
