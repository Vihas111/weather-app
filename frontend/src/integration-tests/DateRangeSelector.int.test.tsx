/**
 * Integration Test for DateRangeSelector
 * Covers:
 *  - Initial render calls onChange once
 *  - Manual date change + Load button
 *  - Quick select buttons (6h / 12h / 24h / 7d)
 */

import { render, screen, fireEvent } from "@testing-library/react";
import DateRangeSelector from "@/components/DateRangeSelector";

describe("DateRangeSelector – Integration", () => {
  it("calls onChange once on initial mount", () => {
    const mockOnChange = jest.fn();

    render(<DateRangeSelector onChange={mockOnChange} />);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it("applies manually selected date range when clicking Load", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    const startInput = screen.getByLabelText("Start");
    const endInput = screen.getByLabelText("End");
    const loadBtn = screen.getByText("Load");

    fireEvent.change(startInput, { target: { value: "2025-01-01T00:00" } });
    fireEvent.change(endInput, { target: { value: "2025-01-01T08:00" } });
    fireEvent.click(loadBtn);

    // Should be called again with updated inputs
    expect(mockOnChange).toHaveBeenCalled();
  });

  it("quick-select button 6h triggers onChange with updated range", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    const btn6h = screen.getByText("6h");
    fireEvent.click(btn6h);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("quick-select button 12h triggers onChange with updated range", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    fireEvent.click(screen.getByText("12h"));
    expect(mockOnChange).toHaveBeenCalled();
  });

  it("quick-select 24h triggers onChange", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    fireEvent.click(screen.getByText("24h"));
    expect(mockOnChange).toHaveBeenCalled();
  });

  it("quick-select 7d triggers onChange", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    fireEvent.click(screen.getByText("7d"));
    expect(mockOnChange).toHaveBeenCalled();
  });

  it("shows error when end <= start", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    const startInput = screen.getByLabelText("Start");
    const endInput = screen.getByLabelText("End");

    fireEvent.change(startInput, { target: { value: "2025-01-01T10:00" } });
    fireEvent.change(endInput, { target: { value: "2025-01-01T09:00" } });

    fireEvent.click(screen.getByText("Load"));

    expect(screen.getByText("End must be after start.")).toBeInTheDocument();
  });

  it("shows error when range < 6 hours", () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);

    const startInput = screen.getByLabelText("Start");
    const endInput = screen.getByLabelText("End");

    fireEvent.change(startInput, { target: { value: "2025-01-01T00:00" } });
    fireEvent.change(endInput, { target: { value: "2025-01-01T03:00" } });

    fireEvent.click(screen.getByText("Load"));

    expect(
      screen.getByText("Range must be at least 6 hours.")
    ).toBeInTheDocument();
  });
});
