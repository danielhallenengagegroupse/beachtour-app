"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useYear } from "@/app/contexts/year-context";

interface PlayerStanding {
  id: number;
  playerId: number;
  player: { id: number; name: string };
  weekId?: number;
  totalPoints: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
}

interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  rounds: number;
  hasMatches?: boolean;
  hasWeeklyStandings?: boolean;
}

function formatHalfValue(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("sv-SE")
    : value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPercentage(value: number) {
  return value.toLocaleString("sv-SE", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function StandingsPage() {
  const { year, setYear, availableYears } = useYear();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedWeek(null);
    setStandings([]);
    fetchWeeks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    if (selectedWeek) {
      fetchWeeklyStandings(selectedWeek.id);
    }
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const response = await fetch(`/api/weeks?activity=1&year=${year}`);
      const data = await response.json();
      const nextWeeks = Array.isArray(data) ? data : [];
      setWeeks(nextWeeks);
      if (nextWeeks.length > 0) {
        const latestWithStandings = [...nextWeeks]
          .reverse()
          .find((week) => week.hasWeeklyStandings);
        const latestWithMatches = [...nextWeeks]
          .reverse()
          .find((week) => week.hasMatches);

        setSelectedWeek(latestWithStandings ?? latestWithMatches ?? nextWeeks[nextWeeks.length - 1]);
      }
    } catch (err) {
      console.error("Failed to fetch weeks:", err);
    }
  };

  const fetchWeeklyStandings = async (weekId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/standings?type=weekly&weekId=${weekId}`);
      const data = await response.json();
      setStandings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch standings:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🎯 Resultat per vecka</h1>
            <p className="text-indigo-100 mt-2">Se veckans rankingar och poäng</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-indigo-100">År:</span>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="rounded px-3 py-1.5 text-sm font-medium text-indigo-700 bg-white border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <Link href="/public/matches" className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-400">
              Till Matcher
            </Link>
            <Link href="/public" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50">
              ← Startsida
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Week Selection */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {weeks.map((week) => (
              <button
                key={week.id}
                onClick={() => setSelectedWeek(week)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedWeek?.id === week.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-indigo-50"
                }`}
              >
                Vecka {week.weekNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Standings Table */}
        {selectedWeek && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Laddar ställning...</div>
            ) : standings.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Ingen ställningsdata tillgänglig för denna vecka.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">Pos</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">Spelare</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700">Matcher</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700">Vinster</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700">Förluster</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700">Vinst %</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700">Poäng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {standings.map((standing, index) => {
                      const isSameRank = (a: PlayerStanding, b: PlayerStanding) =>
                        a.winPercentage === b.winPercentage &&
                        a.wins === b.wins &&
                        a.losses === b.losses &&
                        a.gamesPlayed === b.gamesPlayed;
                      const rank =
                        index === 0 || !isSameRank(standing, standings[index - 1])
                          ? index + 1
                          : standings.slice(0, index).findIndex((s) => isSameRank(s, standing)) + 1;
                      return (
                      <tr key={standing.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm font-bold text-gray-900">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs">
                            {rank}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-gray-900">
                          {standing.player.name}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-600">
                          {standing.gamesPlayed}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-green-600 font-medium">
                          {formatHalfValue(standing.wins)}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-red-600 font-medium">
                          {formatHalfValue(standing.losses)}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-indigo-700 font-semibold">
                          {formatPercentage(standing.winPercentage)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                            {standing.totalPoints}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
