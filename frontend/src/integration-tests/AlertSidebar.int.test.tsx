import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AlertSidebar from "../components/AlertSidebar";

describe("AlertSidebar — Integration Test", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            active: true,
            breaches: [{ city: "Mumbai", breaches: ["Temperature"] }],
          }),
      })
    ) as jest.Mock;
  });

  it("fetches and displays alerts from backend", async () => {
    render(<AlertSidebar />);

    await waitFor(() =>
      expect(screen.getByText("Mumbai")).toBeInTheDocument()
    );
  });
});
