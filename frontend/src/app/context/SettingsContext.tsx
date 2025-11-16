"use client"; // This file must be a Client Component

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 1. Define the type for a single setting
export interface ThresholdSetting {
  city: string;
  max_temp: number;
  min_temp: number;
  max_chance_of_rain: number; // This is our new field
}

// 2. Define what our context will provide
interface SettingsContextType {
  settings: ThresholdSetting[];
  saveSettings: (newSettings: ThresholdSetting[]) => void;
  isLoading: boolean;
}

// 3. Create the Context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 4. Create the "Provider" component
export function SettingsProvider({ children }: { children: ReactNode }) {
  // State for the settings. Start with an empty list.
  const [settings, setSettings] = useState<ThresholdSetting[]>([]);
  
  // State to prevent UI from flickering on load
  const [isLoading, setIsLoading] = useState(true);

  // --- THIS IS THE FIX ---
  // Load settings from localStorage when the app first starts
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('userThresholds');
      // Set settings OR default to an empty array
      setSettings(savedSettings ? JSON.parse(savedSettings) : []);
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
      setSettings([]); // Set to empty array on error
    } finally {
      // This runs *after* the try/catch is complete
      setIsLoading(false);
    }
  }, []); // Empty array [] ensures this runs only once
  // --- END OF FIX ---

  // Function to save settings to both state and localStorage
  const saveSettings = (newSettings: ThresholdSetting[]) => {
    try {
      setSettings(newSettings);
      localStorage.setItem('userThresholds', JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  };

  // Don't render the rest of the app until we've loaded settings
  if (isLoading) {
    return null; 
  }

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

// 5. Create a custom hook to easily use the context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}