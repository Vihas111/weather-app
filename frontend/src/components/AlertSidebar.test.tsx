import React from "react";
import { render, screen } from "@testing-library/react";
import AlertSidebar from "./AlertSidebar";

describe("AlertSidebar Component", () => {
  it("renders empty message when no alerts", () => {
    render(<AlertSidebar active={false} breaches={[]} />);
    expect(
      screen.getByText("No extreme weather alerts 😊")
    ).toBeInTheDocument();
  });

  it("renders list of alerts", () => {
    const breaches = [
      { city: "Bangalore", breaches: ["Temperature", "Wind"] },
      { city: "Chennai", breaches: ["Humidity"] },
    ];

    render(<AlertSidebar active={true} breaches={breaches} />);

    expect(screen.getByText("Bangalore")).toBeInTheDocument();
    expect(screen.getByText("Chennai")).toBeInTheDocument();
  });

  it("shows individual breach items", () => {
    const breaches = [
      { city: "Bangalore", breaches: ["Temperature"] },
    ];

    render(<AlertSidebar active={true} breaches={breaches} />);

    expect(screen.getByText("Temperature")).toBeInTheDocument();
  });
});
