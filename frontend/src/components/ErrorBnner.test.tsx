import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBanner from "./ErrorBanner";

describe("ErrorBanner Component", () => {
  it("renders the message and applies correct styling", () => {
    render(<ErrorBanner message="Error 404" />);

    // Get the container using role="alert"
    const banner = screen.getByRole("alert");

    // Ensure message is visible
    expect(screen.getByText("Error 404")).toBeInTheDocument();

    // Check styling
    expect(banner.className).toContain("bg-red-100");
    expect(banner.className).toContain("border-red-300");
  });
});
