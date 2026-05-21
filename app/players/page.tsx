"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Player {
  id: number;
  name: string;
  weeksPlayed: number;
  createdAt: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "" });

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/players");
      const data = await response.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Misslyckades att hämta spelare");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: "" });
        await fetchPlayers();
      } else {
        setError("Misslyckades att registrera spelare");
      }
    } catch (err) {
      setError("Fel vid registrering av spelare");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (player: Player) => {
    const approved = window.confirm(
      `Vill du radera spelaren ${player.name}? Detta tar bort spelaren fran alla veckor och matcher.`
    );

    if (!approved) {
      return;
    }

    setDeletingPlayerId(player.id);
    setError("");

    try {
      const response = await fetch("/api/players", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Misslyckades att radera spelare");
      }

      await fetchPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel vid radering av spelare");
      console.error(err);
    } finally {
      setDeletingPlayerId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">👥 Spelare</h1>
            <p className="text-indigo-100 mt-2">Registrera och hantera spelare</p>
          </div>
          <Link href="/" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50">
            ← Till Startsidan
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Registrera Ny Spelare</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spelarnamn *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ange spelarnamn"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Registrerar..." : "Registrera Spelare"}
            </button>
          </form>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Registrerade Spelare ({players.length})</h2>
          </div>

          {players.length === 0 ? (
            <div className="px-8 py-12 text-center text-gray-500">
              Inga spelare registrerade ännu. Lägg till din första spelare ovan!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Namn</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Antal spelade veckor</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Registrerad</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Åtgärd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{player.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{player.weeksPlayed}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(player.createdAt).toLocaleDateString("sv-SE")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeletePlayer(player)}
                          disabled={deletingPlayerId === player.id}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingPlayerId === player.id ? "Raderar..." : "Radera"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
