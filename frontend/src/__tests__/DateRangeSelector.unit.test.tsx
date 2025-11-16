/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import DateRangeSelector from "../components/DateRangeSelector";
import "@testing-library/jest-dom";

describe("DateRangeSelector - Unit Tests", () => {
  it("renders start and end inputs", () => {
    const mockFn = jest.fn();
    render(<DateRangeSelector onChange={mockFn} />);

    expect(screen.getByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("End")).toBeInTheDocument();
  });

  it("renders quick buttons (6h, 12h, 24h, 7d)", () => {
    const mockFn = jest.fn();
    render(<DateRangeSelector onChange={mockFn} />);

    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("12h")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("calls onChange on mount", () => {
    const mockFn = jest.fn();
    render(<DateRangeSelector onChange={mockFn} />);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("shows error when end <= start", () => {
    const mockFn = jest.fn();
    render(<DateRangeSelector onChange={mockFn} />);

    const start = screen.getByLabelText("Start");
    const end = screen.getByLabelText("End");

    fireEvent.change(start, { target: { value: "2025-11-13T10:00" } });
    fireEvent.change(end, { target: { value: "2025-11-13T09:00" } });

    fireEvent.click(screen.getByText("Load"));

    expect(screen.getByText("End must be after start.")).toBeInTheDocument();
  });

  it("shows error if range < 6 hours", () => {
    const mockFn = jest.fn();
    render(<DateRangeSelector onChange={mockFn} />);

    const start = screen.getByLabelText("Start");
    const end = screen.getByLabelText("End");

    fireEvent.change(start, { target: { value: "2025-11-13T10:00" } });
    fireEvent.change(end, { target: { value: "2025-11-13T11:00" } });

    fireEvent.click(screen.getByText("Load"));

    expect(
      screen.getByText("Range must be at least 6 hours.")
    ).toBeInTheDocument();
  });
});
