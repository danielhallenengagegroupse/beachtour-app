"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchWeeklyStandings(selectedWeek.id);
    }
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const response = await fetch("/api/weeks?activity=1");
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
          <div className="flex gap-3">
            <Link href="/public/matches" className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-400">
              Till Matcher
            </Link>
            <Link href="/public" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50">
              ← Till Publik Startsida
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
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
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Position</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Spelare</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Matcher Spelade</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Vinster</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Förluster</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Vinst %</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Total Poäng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {standings.map((standing, index) => {
                      const rank = index === 0 || standing.totalPoints !== standings[index - 1].totalPoints
                        ? index + 1
                        : standings
                            .slice(0, index)
                            .findIndex((s) => s.totalPoints === standing.totalPoints) + 1;
                      return (
                      <tr key={standing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white">
                            {rank}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {standing.player.name}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {standing.gamesPlayed}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-green-600 font-medium">
                          {formatHalfValue(standing.wins)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-red-600 font-medium">
                          {formatHalfValue(standing.losses)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-indigo-700 font-semibold">
                          {formatPercentage(standing.winPercentage)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold">
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
