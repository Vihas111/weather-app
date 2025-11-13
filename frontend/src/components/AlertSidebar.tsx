"use client";

import React from "react";

type BreachEntry = {
  city: string;
  breaches: string[];
};

type AlertData = {
  active: boolean;
  breaches: BreachEntry[];
};

export default function AlertSidebar({ alertData }: { alertData: AlertData | null }) {
  if (!alertData || !alertData.active || alertData.breaches.length === 0) {
    return (
      <div className="fixed left-4 top-24 w-72 bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h2 className="font-bold text-lg">⚠️ Extreme Alerts</h2>
        <p className="text-gray-500 text-sm mt-2">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="fixed left-4 top-24 w-72 max-h-[80vh] overflow-y-auto bg-red-50 border border-red-300 shadow-md rounded-lg p-4">
      <h2 className="font-bold text-lg text-red-700">⚠️ Extreme Alerts</h2>

      {alertData.breaches.map((entry: BreachEntry, i: number) => (
        <div key={i} className="mt-4 bg-red-100 border border-red-300 rounded p-3">
          <p className="font-semibold text-red-700">{entry.city}</p>

          {entry.breaches.map((b, idx) => (
            <p key={idx} className="text-sm text-red-800">
              {b}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
