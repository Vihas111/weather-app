import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBanner from "../components/ErrorBanner";

describe("ErrorBanner — Integration Test", () => {
  it("reflects real parent error", () => {
    const parentErrorMessage = "City not found";

    render(<ErrorBanner message={parentErrorMessage} />);

    expect(screen.getByText("City not found")).toBeInTheDocument();
  });
});
