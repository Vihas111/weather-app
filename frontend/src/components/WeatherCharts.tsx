"use client";

import { useRef } from "react";
import { Line } from "react-chartjs-2";
import jsPDF from "jspdf";
import type { Chart } from "chart.js";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

interface WeatherChartsProps {
  hourly: Array<{
    time: string;
    temp: number;
    wind: number;
    icon: string;
  }>;

  daily: Array<{
    date: string;
    max_temp: number;
    min_temp: number;
    condition: string;
    icon: string;
  }>;
}

export default function WeatherCharts({ hourly, daily }: WeatherChartsProps) {
  // 🔥 MUST be before any return
  const tempChartRef = useRef<Chart<"line"> | null>(null);
  const windChartRef = useRef<Chart<"line"> | null>(null);
  const dailyChartRef = useRef<Chart<"line"> | null>(null);

  if (!hourly?.length || !daily?.length) {
    return <p className="text-gray-600">Charts will appear once data loads...</p>;
  }

  // ───────────────────────────────────────────────
  // EXPORT HELPERS
  // ───────────────────────────────────────────────
  const exportPNG = (
    ref: React.RefObject<Chart<"line"> | null>,
    filename: string
  ) => {
    if (!ref.current) return;
    const url = ref.current.toBase64Image();
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.png`;
    link.click();
  };

  const exportPDF = (
    ref: React.RefObject<Chart<"line"> | null>,
    filename: string
  ) => {
    if (!ref.current) return;

    const imgData = ref.current.toBase64Image();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: "a4",
    });

    pdf.addImage(imgData, "PNG", 20, 20, 550, 350);
    pdf.save(`${filename}.pdf`);
  };

  const exportAllPDF = () => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: "a4",
    });

    const charts = [
      { ref: tempChartRef, title: "Hourly Temperature" },
      { ref: windChartRef, title: "Hourly Wind Speed" },
      { ref: dailyChartRef, title: "3-Day Temperature Trend" },
    ];

    charts.forEach((chart, index) => {
      const instance = chart.ref.current;
      if (!instance) return;

      if (index !== 0) pdf.addPage();

      const img = instance.toBase64Image();

      pdf.setFontSize(18);
      pdf.text(chart.title, 20, 25);
      pdf.addImage(img, "PNG", 20, 40, 550, 350);
    });

    pdf.save("all_charts.pdf");
  };

  // ───────────────────────────────────────────────
  // CHART DATA
  // ───────────────────────────────────────────────

  const tempData = {
    labels: hourly.map((h) => h.time),
    datasets: [
      {
        label: "Temperature (°C)",
        data: hourly.map((h) => h.temp),
        borderColor: "rgb(37, 99, 235)",
        backgroundColor: "rgba(37, 99, 235, 0.4)",
      },
    ],
  };

  const windData = {
    labels: hourly.map((h) => h.time),
    datasets: [
      {
        label: "Wind (kph)",
        data: hourly.map((h) => h.wind),
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.4)",
      },
    ],
  };

  const dailyData = {
    labels: daily.map((d) => d.date),
    datasets: [
      {
        label: "Max Temp (°C)",
        data: daily.map((d) => d.max_temp),
        borderColor: "rgb(220, 38, 38)",
      },
      {
        label: "Min Temp (°C)",
        data: daily.map((d) => d.min_temp),
        borderColor: "rgb(34, 197, 94)",
      },
    ],
  };

  // ───────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────

  return (
    <div className="space-y-8 mt-8">

      {/* DOWNLOAD ALL BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={exportAllPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
        >
          📥 Download All Charts (PDF)
        </button>
      </div>

      {/* TEMP CHART */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Hourly Temperature</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportPNG(tempChartRef, "hourly_temperature")}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              PNG
            </button>
            <button
              onClick={() => exportPDF(tempChartRef, "hourly_temperature")}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              PDF
            </button>
          </div>
        </div>
        <Line ref={tempChartRef} data={tempData} />
      </div>

      {/* WIND CHART */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Hourly Wind Speed</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportPNG(windChartRef, "hourly_wind")}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              PNG
            </button>
            <button
              onClick={() => exportPDF(windChartRef, "hourly_wind")}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              PDF
            </button>
          </div>
        </div>
        <Line ref={windChartRef} data={windData} />
      </div>

      {/* DAILY CHART */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">3-Day Temperature Trend</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportPNG(dailyChartRef, "three_day_temperature")}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              PNG
            </button>
            <button
              onClick={() => exportPDF(dailyChartRef, "three_day_temperature")}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              PDF
            </button>
          </div>
        </div>
        <Line ref={dailyChartRef} data={dailyData} />
      </div>
    </div>
  );
}
