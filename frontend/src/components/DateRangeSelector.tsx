"use client";

import React, { useEffect, useState } from "react";

const MIN_HOURS = 6;

function toInputValue(d: Date) {
  return d.toISOString().slice(0, 16);
}

export default function DateRangeSelector({
  onChange,
}: {
  onChange: (startISO: string, endISO: string) => void;
}) {
  const now = new Date();
  const defaultEnd = now;
  const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [start, setStart] = useState(toInputValue(defaultStart));
  const [end, setEnd] = useState(toInputValue(defaultEnd));
  const [error, setError] = useState("");

  // call once on mount so page shows initial data
  useEffect(() => {
    onChange(start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = (e.getTime() - s.getTime()) / 3600000;

    if (e <= s) {
      setError("End must be after start.");
      return;
    }
    if (diff < MIN_HOURS) {
      setError(`Range must be at least ${MIN_HOURS} hours.`);
      return;
    }

    setError("");
    onChange(start, end);
  };

  const setLastHours = (hours: number) => {
    const e = new Date();
    const s = new Date(e.getTime() - hours * 3600000);
    const sIso = toInputValue(s);
    const eIso = toInputValue(e);

    setStart(sIso);
    setEnd(eIso);
    setError("");
    onChange(sIso, eIso);
  };

  const setLastDays = (days: number) => {
    const e = new Date();
    const s = new Date(e.getTime() - days * 24 * 3600000);
    const sIso = toInputValue(s);
    const eIso = toInputValue(e);

    setStart(sIso);
    setEnd(eIso);
    setError("");
    onChange(sIso, eIso);
  };

  return (
    <div>
      {/* mobile-first: column on xs, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="start-input" className="block text-sm text-black mb-1">
            Start
          </label>
          <input
            id="start-input"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm sm:text-base min-w-0"
            aria-label="Start date and time"
          />
        </div>

        <div className="flex-1 min-w-0">
          <label htmlFor="end-input" className="block text-sm text-black mb-1">
            End
          </label>
          <input
            id="end-input"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm sm:text-base min-w-0"
            aria-label="End date and time"
          />
        </div>

        <div className="shrink-0 flex items-end gap-2">
          <button
            onClick={apply}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            aria-label="Load range"
          >
            Load
          </button>

          {/* quick-range buttons wrap on small screens */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLastHours(6)}
              className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
              aria-label="Last 6 hours"
            >
              6h
            </button>

            <button
              onClick={() => setLastHours(12)}
              className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
              aria-label="Last 12 hours"
            >
              12h
            </button>

            <button
              onClick={() => setLastHours(24)}
              className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
              aria-label="Last 24 hours"
            >
              24h
            </button>

            <button
              onClick={() => setLastDays(7)}
              className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
              aria-label="Last 7 days"
            >
              7d
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
