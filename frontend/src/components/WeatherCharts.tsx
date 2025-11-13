"use client";

import { Line } from "react-chartjs-2";
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
  console.log("WeatherCharts received:", hourly, daily);

  if (!hourly?.length || !daily?.length)
    return <p className="text-gray-600">Charts will appear once data loads...</p>;

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
        label: "Wind Speed (kph)",
        data: hourly.map((h) => h.wind),
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.4)",
      },
    ],
  };

  const dailyComparison = {
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

  return (
    <div className="space-y-8 mt-8">
      <div className="bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-3">Hourly Temperature</h2>
        <Line data={tempData} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-3">Hourly Wind Speed</h2>
        <Line data={windData} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-3">3-Day Temperature Trend</h2>
        <Line data={dailyComparison} />
      </div>
    </div>
  );
}
