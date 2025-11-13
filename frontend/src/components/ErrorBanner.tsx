"use client";

import React from "react";

interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"   // <-- REQUIRED FOR TESTS
      className="mt-4 p-3 rounded-md bg-red-100 text-red-700 border border-red-300"
    >
      {message}
    </div>
  );
}
