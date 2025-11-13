/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import AlertSidebar from "../components/AlertSidebar";
import "@testing-library/jest-dom";

global.fetch = jest.fn();

describe("AlertSidebar — Unit Tests", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it("shows friendly message when no alerts", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ active: false, breaches: [] }),
    });

    render(<AlertSidebar />);

    expect(
      await screen.findByText("No extreme weather alerts 😊")
    ).toBeInTheDocument();
  });

  it("renders alert cities", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active: true,
        breaches: [
          { city: "Bangalore", breaches: ["Wind", "Heat"] },
          { city: "Chennai", breaches: ["Humidity"] },
        ],
      }),
    });

    render(<AlertSidebar />);

    expect(await screen.findByText("Bangalore")).toBeInTheDocument();
    expect(await screen.findByText("Chennai")).toBeInTheDocument();
  });

  it("renders individual alert conditions", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active: true,
        breaches: [{ city: "Delhi", breaches: ["Heatwave"] }],
      }),
    });

    render(<AlertSidebar />);

    expect(await screen.findByText("Heatwave")).toBeInTheDocument();
  });
});
