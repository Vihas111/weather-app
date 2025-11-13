import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

import HealthAlert from "@/components/HealthAlert";
import AlertSidebar from "@/components/AlertSidebar";
import WeatherApp from "@/components/WeatherApp";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nimbus Weather",
  description: "Real-time Weather Analytics and Alerts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <HealthAlert />
        <AlertSidebar />
        {children}
      </body>
    </html>
  );
}
