"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SeasonStanding {
  playerId: number;
  player: { id: number; name: string };
  weekPoints: number[];
  droppedWeekIndexes: number[];
  droppedPoints: number;
  totalPoints: number;
}

interface SeasonWeek {
  id: number;
  weekNumber: number;
}

interface SeasonStandingsResponse {
  weeks: SeasonWeek[];
  standings: SeasonStanding[];
}

export default function SeasonStandingsPage() {
  const [weeks, setWeeks] = useState<SeasonWeek[]>([]);
  const [standings, setStandings] = useState<SeasonStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasonStandings();
  }, []);

  const fetchSeasonStandings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/standings?type=season");
      const data: SeasonStandingsResponse = await response.json();
      setWeeks(Array.isArray(data?.weeks) ? data.weeks : []);
      setStandings(Array.isArray(data?.standings) ? data.standings : []);
    } catch (err) {
      console.error("Failed to fetch season standings:", err);
      setWeeks([]);
      setStandings([]);
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
            <h1 className="text-3xl font-bold">🏆 Säsongens Ställning</h1>
            <p className="text-indigo-100 mt-2">Totalt ställning för hela säsongen</p>
          </div>
          <Link href="/public" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50">
            ← Startsida
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Standings Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Laddar ställning...</div>
          ) : standings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Ingen ställningsdata tillgänglig än.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">Pos</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">Spelare</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700">Totalt</th>
                    {weeks.map((week) => (
                      <th key={week.id} className="px-2 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap">
                        V{week.weekNumber}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {standings.map((standing, index) => {
                    const rank = index === 0 || standing.totalPoints !== standings[index - 1].totalPoints
                      ? index + 1
                      : standings.slice(0, index).findIndex((s) => s.totalPoints === standing.totalPoints) + 1;
                    let medalEmoji = "";
                    if (rank === 1) medalEmoji = "🥇";
                    else if (rank === 2) medalEmoji = "🥈";
                    else if (rank === 3) medalEmoji = "🥉";

                    return (
                      <tr
                        key={standing.playerId}
                        className={`hover:bg-gray-50 ${
                          rank <= 3 ? "bg-yellow-50" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-sm font-bold text-gray-900">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs">
                            {medalEmoji || rank}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {standing.player.name}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
                            {standing.totalPoints}
                          </span>
                        </td>
                        {standing.weekPoints.map((points, pointsIndex) => (
                          <td
                            key={`${standing.playerId}-${pointsIndex}`}
                            className={`px-2 py-3 text-center text-sm font-medium ${
                              standing.droppedWeekIndexes.includes(pointsIndex) ? "text-red-600" : "text-gray-700"
                            }`}
                          >
                            {points}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && standings.length > 0 && (
            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-700">
              <span className="font-medium text-red-600">Röd text</span> = borttagna veckor (de 2 lägsta veckopoängen)
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-indigo-50 border-l-4 border-indigo-600 rounded-lg p-6">
          <h3 className="font-bold text-indigo-900 mb-2">Hur Poängräkningen Fungerar</h3>
          <p className="text-indigo-800 text-sm">
            Spelare tjänar poäng varje vecka baserat på poängtabellen. Alla veckor visas i tabellen, även om de inte spelats ännu.
            De två lägsta veckopoängen räknas bort från totalsumman.
          </p>
        </div>
      </div>
    </main>
  );
}
