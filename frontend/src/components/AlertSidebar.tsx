"use client";

import { useEffect, useState } from "react";

type BreachEntry = {
  city: string;
  breaches: string[];
};

type AlertStatus = {
  active: boolean;
  breaches: BreachEntry[];
};

export default function AlertSidebar() {
  const [alert, setAlert] = useState<AlertStatus | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/alerts/status", {
          cache: "no-store",
        });
        const data: AlertStatus = await res.json();
        setAlert(data);
      } catch (err) {
        console.log("Alert fetch failed:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        left: "20px",
        width: "320px",
        maxHeight: "70vh",
        overflowY: "auto",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
        zIndex: 9999,
        border: "2px solid #ffcccc",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px 0",
          fontSize: "20px",
          fontWeight: "700",
          color: "#d32f2f",
        }}
      >
        ⚠️ Extreme Alerts
      </h2>

      {!alert || !alert.active ? (
        <p style={{ color: "#4caf50" }}>No extreme weather alerts 😊</p>
      ) : (
        alert.breaches.map((entry, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "14px",
              padding: "10px",
              borderRadius: "8px",
              background: "#ffe8e8",
              border: "1px solid #ffb3b3",
            }}
          >
            <strong style={{ fontSize: "16px", color: "#b71c1c" }}>
              {entry.city}
            </strong>

            <ul style={{ marginTop: "6px", paddingLeft: "20px" }}>
              {entry.breaches.map((b, j) => (
                <li key={j} style={{ marginBottom: "4px", color: "#333" }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
