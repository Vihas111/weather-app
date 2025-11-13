/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import AlertSidebar from "../components/AlertSidebar";
import "@testing-library/jest-dom";

global.fetch = jest.fn();

describe("AlertSidebar — Integration Test", () => {
  it("renders full alert card structure when data arrives", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active: true,
        breaches: [
          {
            city: "Mumbai",
            breaches: ["High Wind", "Heatwave"],
          },
        ],
      }),
    });

    render(<AlertSidebar />);

    // Check city appears
    expect(await screen.findByText("Mumbai")).toBeInTheDocument();

    // Check breach items
    expect(await screen.findByText("High Wind")).toBeInTheDocument();
    expect(await screen.findByText("Heatwave")).toBeInTheDocument();
  });
});
