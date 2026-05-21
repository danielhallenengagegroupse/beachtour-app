"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RankingPointRule {
  id?: number;
  position: number;
  points: number;
}

export default function RankingPointsPage() {
  const [rules, setRules] = useState<RankingPointRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const response = await fetch("/api/ranking-points");
      const data = await response.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error("Failed to fetch ranking points:", fetchError);
      setError("Misslyckades att hämta poängtabellen.");
    }
  }

  function updateRule(index: number, field: "position" | "points", value: string) {
    setRules((current) =>
      current.map((rule, ruleIndex) =>
        ruleIndex === index
          ? { ...rule, [field]: Number(value) || 0 }
          : rule
      )
    );
  }

  function addRule() {
    const nextPosition = (rules.at(-1)?.position ?? 0) + 1;
    setRules((current) => [...current, { position: nextPosition, points: 0 }]);
  }

  function removeRule(index: number) {
    setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  async function handleSaveRules() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ranking-points", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save ranking points");
      }

      await fetchRules();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Misslyckades att spara poängtabellen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">🏅 Poängtabell</h1>
            <p className="mt-2 text-indigo-100">Hantera rankingpoäng per placering.</p>
          </div>
          <Link href="https://beachtour.vkbjarke.se/admin" className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50">
            ← Till Startsidan
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12">
        {error && <div className="mb-6 rounded bg-red-100 p-3 text-red-700">{error}</div>}

        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Poängtabell</h2>
              <p className="mt-1 text-sm text-gray-500">
                Spelare med samma antal vinster får samma placering och samma rankingpoäng. Nästa placering hoppar enligt delad placering.
              </p>
            </div>
            <button
              type="button"
              onClick={addRule}
              className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
            >
              Lägg till rad
            </button>
          </div>

          <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-3">
            <span className="px-4 text-sm font-medium text-gray-500">Placering</span>
            <span className="px-4 text-sm font-medium text-gray-500">Poäng</span>
            <span />
          </div>

          <div className="space-y-3">
            {rules.length === 0 && (
              <p className="text-sm text-gray-500">Inga regler tillagda ännu.</p>
            )}
            {rules.map((rule, index) => (
              <div key={`${rule.position}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-3">
                <input
                  type="number"
                  min="1"
                  value={rule.position}
                  onChange={(event) => updateRule(index, "position", event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  value={rule.points}
                  onChange={(event) => updateRule(index, "points", event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveRules()}
              disabled={loading || rules.length === 0}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Sparar..." : "Spara poängtabell"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
