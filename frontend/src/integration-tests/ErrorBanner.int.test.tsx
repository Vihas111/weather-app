/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBanner from "../components/ErrorBanner";
import "@testing-library/jest-dom";

describe("ErrorBanner — Integration Test", () => {
  it("correctly displays error passed from parent", () => {
    const errorFromParent = "City not found";

    render(<ErrorBanner message={errorFromParent} />);

    expect(screen.getByText("City not found")).toBeInTheDocument();
  });
});
