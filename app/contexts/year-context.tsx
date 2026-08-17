"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const YEAR_KEY = "beachtour_year";
const DEFAULT_YEAR = 2026;
const MIN_YEAR = 2026;
const MAX_YEAR = 2040;

function getAvailableYears(): number[] {
  const years: number[] = [];
  for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
    years.push(y);
  }
  return years;
}

type YearContextValue = {
  year: number;
  setYear: (year: number) => void;
  availableYears: number[];
};

const YearContext = createContext<YearContextValue>({
  year: DEFAULT_YEAR,
  setYear: () => {},
  availableYears: getAvailableYears(),
});

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState<number>(DEFAULT_YEAR);

  useEffect(() => {
    const stored = localStorage.getItem(YEAR_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= MIN_YEAR && parsed <= MAX_YEAR) {
        setYearState(parsed);
        return;
      }
    }
    // No explicit user selection — auto-detect the latest year with active weeks
    fetch("/api/weeks?latestYear=1")
      .then((res) => res.json())
      .then((data: unknown) => {
        const y = (data as { year?: number }).year;
        if (typeof y === "number" && y >= MIN_YEAR && y <= MAX_YEAR) {
          setYearState(y);
        }
      })
      .catch(() => {
        // Keep default
      });
  }, []);

  function setYear(newYear: number) {
    setYearState(newYear);
    localStorage.setItem(YEAR_KEY, newYear.toString());
  }

  return (
    <YearContext.Provider value={{ year, setYear, availableYears: getAvailableYears() }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  return useContext(YearContext);
}
