"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const YEAR_KEY = "beachtour_year";
const DEFAULT_YEAR = 2026;

function getAvailableYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2026; y <= current + 1; y++) {
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
      if (!isNaN(parsed) && parsed >= 2026) {
        setYearState(parsed);
      }
    }
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
