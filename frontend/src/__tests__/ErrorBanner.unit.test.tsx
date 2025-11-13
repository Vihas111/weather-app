/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBanner from "../components/ErrorBanner";
import "@testing-library/jest-dom";

describe("ErrorBanner — Unit Test", () => {
  it("renders the message and correct styles", () => {
    render(<ErrorBanner message="Error 404" />);

    const banner = screen.getByRole("alert");

    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(banner.className).toContain("bg-red-100");
    expect(banner.className).toContain("border-red-300");
  });
});
