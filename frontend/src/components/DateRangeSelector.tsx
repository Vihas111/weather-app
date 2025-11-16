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

  useEffect(() => {
    onChange(start, end);
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
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-4">
          <label htmlFor="start-input" className="block text-sm text-black">
            Start
          </label>
          <input
            id="start-input"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>

        <div className="col-span-4">
          <label htmlFor="end-input" className="block text-sm text-black">
            End
          </label>
          <input
            id="end-input"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>

        <div className="col-span-4 flex gap-2 items-end">
          <button
            onClick={apply}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            Load
          </button>

          <button
            onClick={() => setLastHours(6)}
            className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
          >
            6h
          </button>

          <button
            onClick={() => setLastHours(12)}
            className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
          >
            12h
          </button>

          <button
            onClick={() => setLastHours(24)}
            className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
          >
            24h
          </button>

          <button
            onClick={() => setLastDays(7)}
            className="px-2 py-1 bg-gray-800 text-white text-xs rounded"
          >
            7d
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
