import React from "react";
import { render, screen } from "@testing-library/react";
import AlertSidebar from "../components/AlertSidebar";

describe("AlertSidebar — Unit Tests", () => {
  it("shows friendly message when no alerts", () => {
    render(<AlertSidebar active={false} breaches={[]} />);

    expect(
      screen.getByText("No extreme weather alerts 😊")
    ).toBeInTheDocument();
  });

  it("renders alert cities", () => {
    const breaches = [
      { city: "Bangalore", breaches: ["Wind", "Heat"] },
      { city: "Chennai", breaches: ["Humidity"] },
    ];

    render(<AlertSidebar active={true} breaches={breaches} />);

    expect(screen.getByText("Bangalore")).toBeInTheDocument();
    expect(screen.getByText("Chennai")).toBeInTheDocument();
  });

  it("renders individual alert conditions", () => {
    const breaches = [{ city: "Delhi", breaches: ["Heatwave"] }];

    render(<AlertSidebar active={true} breaches={breaches} />);

    expect(screen.getByText("Heatwave")).toBeInTheDocument();
  });
});
