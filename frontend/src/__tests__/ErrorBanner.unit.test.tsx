import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBanner from "../components/ErrorBanner";

describe("ErrorBanner — Unit Tests", () => {
  it("renders the message with correct styles", () => {
    render(<ErrorBanner message="Error 404" />);

    const banner = screen.getByRole("alert");

    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(banner.className).toContain("bg-red-100");
    expect(banner.className).toContain("border-red-300");
  });

  it("returns null when message is empty", () => {
    const { container } = render(<ErrorBanner message="" />);
    expect(container.firstChild).toBeNull();
  });
});
