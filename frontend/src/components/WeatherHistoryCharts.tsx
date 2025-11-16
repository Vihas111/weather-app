"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type WeatherRow = {
  [key: string]: string | number | null;
};

export default function WeatherHistoryCharts({
  mode,
  data,
  city,
}: {
  mode: "hourly" | "daily";
  data: WeatherRow[];
  city: string;
}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /** CSV Download function */
  function downloadCSV(type: string) {
    if (!data || !data.length) return;

    let cols: string[] = [];
    let rows: string[] = [];

    if (mode === "hourly") {
      if (type === "temperature") cols = ["time", "temp"];
      else if (type === "wind") cols = ["time", "wind"];
      else if (type === "humidity") cols = ["time", "humidity"];
      else if (type === "all") cols = ["time", "temp", "wind", "humidity"];

      rows = data.map((row) => cols.map((c) => String(row[c] ?? "")).join(","));
    } else {
      if (type === "temperature")
        cols = ["date", "temp_avg", "temp_min", "temp_max"];
      else if (type === "wind")
        cols = ["date", "wind_avg", "wind_min", "wind_max"];
      else if (type === "humidity")
        cols = ["date", "humidity_avg", "humidity_min", "humidity_max"];
      else if (type === "sunrise") cols = ["date", "sunrise"];
      else if (type === "sunset") cols = ["date", "sunset"];
      else if (type === "all")
        cols = [
          "date",
          "temp_avg",
          "temp_min",
          "temp_max",
          "wind_avg",
          "wind_min",
          "wind_max",
          "humidity_avg",
          "humidity_min",
          "humidity_max",
          "sunrise",
          "sunset",
        ];

      rows = data.map((row) => cols.map((c) => String(row[c] ?? "")).join(","));
    }

    const csv = [cols.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const href =
      typeof URL !== "undefined" && URL.createObjectURL
        ? URL.createObjectURL(blob)
        : "data:text/csv;charset=utf-8," + encodeURIComponent(csv);

    const link = document.createElement("a");
    link.href = href;
    link.download = `${city}_${type}_${mode}.csv`;
    link.click();
  }

  function downloadAllCSV() {
    downloadCSV("all");
  }

  return (
    <div className="space-y-8">
      {/* Only ONE Download ALL CSV button here */}
      <div className="flex justify-end">
        <button
          onClick={downloadAllCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Download ALL CSV
        </button>
      </div>

      {mode === "hourly" ? (
        <HourlyCharts
          data={data}
          timezone={timezone}
          downloadCSV={downloadCSV}
        />
      ) : (
        <DailyCharts data={data} downloadCSV={downloadCSV} />
      )}
    </div>
  );
}

/* ---------------------------------------------------
   HOURLY CHARTS
---------------------------------------------------- */
function HourlyCharts({
  data,
  timezone,
  downloadCSV,
}: {
  data: WeatherRow[];
  timezone: string;
  downloadCSV: (t: string) => void;
}) {
  const labels = data.map((x) => String(x.time ?? ""));
  const temps = data.map((x) => Number(x.temp ?? 0));
  const winds = data.map((x) => Number(x.wind ?? 0));
  const hums = data.map((x) => Number(x.humidity ?? 0));

  const opts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: "#000" } } },
  scales: {
    x: { ticks: { color: "#000" } },
    y: { ticks: { color: "#000" } },
  },
};


  return (
    <div className="space-y-8">
      <ChartCard
        title="Temperature (Hourly)"
        timezone={timezone}
        download={() => downloadCSV("temperature")}
      >
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Temperature (°C)",
                data: temps,
                borderColor: "rgba(37,99,235,1)",
                backgroundColor: "rgba(37,99,235,0.25)",
              },
            ],
          }}
          options={opts}
        />
      </ChartCard>

      <ChartCard
        title="Wind (Hourly)"
        timezone={timezone}
        download={() => downloadCSV("wind")}
      >
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Wind (kph)",
                data: winds,
                borderColor: "orange",
                backgroundColor: "rgba(249,115,22,0.25)",
              },
            ],
          }}
          options={opts}
        />
      </ChartCard>

      <ChartCard
        title="Humidity (Hourly)"
        timezone={timezone}
        download={() => downloadCSV("humidity")}
      >
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Humidity (%)",
                data: hums,
                borderColor: "green",
                backgroundColor: "rgba(16,185,129,0.25)",
              },
            ],
          }}
          options={opts}
        />
      </ChartCard>
    </div>
  );
}

/* ---------------------------------------------------
   DAILY CHARTS
---------------------------------------------------- */
function DailyCharts({
  data,
  downloadCSV,
}: {
  data: WeatherRow[];
  downloadCSV: (t: string) => void;
}) {
  const dates = data.map((d) => String(d.date ?? ""));

  return (
    <div className="space-y-8">
      <SimpleChartCard
        title="Temperature (Daily)"
        download={() => downloadCSV("temperature")}
        labels={dates}
        dataset={data.map((d) => Number(d.temp_avg ?? 0))}
        color="blue"
      />

      <SimpleChartCard
        title="Wind (Daily)"
        download={() => downloadCSV("wind")}
        labels={dates}
        dataset={data.map((d) => Number(d.wind_avg ?? 0))}
        color="orange"
      />

      <SimpleChartCard
        title="Humidity (Daily)"
        download={() => downloadCSV("humidity")}
        labels={dates}
        dataset={data.map((d) => Number(d.humidity_avg ?? 0))}
        color="green"
      />

      {data[0]?.sunrise && <SunTable data={data} downloadCSV={downloadCSV} />}
    </div>
  );
}

/* ---------------------------------------------------
   REUSABLE COMPONENTS
---------------------------------------------------- */

function ChartCard({
  title,
  children,
  timezone,
  download,
}: {
  title: string;
  children: React.ReactNode;
  timezone: string;
  download: () => void;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold text-black">{title}</h3>

        {/* ONE Download CSV button */}
        <button
          onClick={download}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
        >
          Download CSV
        </button>
      </div>

      <p className="text-gray-500 text-sm italic mb-3">Times shown in your local timezone ({timezone})</p>

      <div style={{ height: 280 }}>{children}</div>
    </div>
  );
}

function SimpleChartCard({
  title,
  download,
  labels,
  dataset,
  color,
}: {
  title: string;
  download: () => void;
  labels: string[];
  dataset: number[];
  color: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold text-black">{title}</h3>
        <button
          onClick={download}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
        >
          Download CSV
        </button>
      </div>

      <div style={{ height: 280 }}>
        <Line
          data={{
            labels,
            datasets: [
              {
                label: title,
                data: dataset,
                borderColor: color,
                backgroundColor: `${color}33`,
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

function SunTable({
  data,
  downloadCSV,
}: {
  data: WeatherRow[];
  downloadCSV: (t: string) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-black">Sunrise & Sunset</h3>

        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV("sunrise")}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            Sunrise CSV
          </button>

          <button
            onClick={() => downloadCSV("sunset")}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            Sunset CSV
          </button>
        </div>
      </div>

      <table className="w-full text-left mt-3">
        <thead>
          <tr className="border-b">
            <th className="py-2">Date</th>
            <th className="py-2">Sunrise</th>
            <th className="py-2">Sunset</th>
          </tr>
        </thead>

        <tbody>
          {data.map((d) => (
            <tr key={String(d.date ?? "")} className="border-b">
              <td className="py-2">{String(d.date ?? "")}</td>
              <td className="py-2">{String(d.sunrise ?? "")}</td>
              <td className="py-2">{String(d.sunset ?? "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
