/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import SearchBar from "../components/SearchBar";
import "@testing-library/jest-dom";

global.fetch = jest.fn();

describe("SearchBar - Integration Tests", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it("performs a full search and displays results", async () => {
    const mockResponse = {
      temperature: 18,
      humidity: 60,
      wind: 12,
      condition: "Clear"
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    render(<SearchBar />);

    fireEvent.change(screen.getByPlaceholderText(/enter city/i), {
      target: { value: "london" }
    });

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText(/Temperature:/)).toBeInTheDocument();
    expect(screen.getByText(/18/)).toBeInTheDocument();
    expect(screen.getByText(/Clear/)).toBeInTheDocument();
  });

  it("shows error message if API returns error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "City not found" })
    });

    render(<SearchBar />);

    fireEvent.change(screen.getByPlaceholderText(/enter city/i), {
      target: { value: "unknown" }
    });

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText(/city not found/i)).toBeInTheDocument();
  });
});
