"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/public");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">Adminpanel</h1>
            <p className="mt-2 text-indigo-100">Hantera spelare, veckor, matcher och resultat.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loading}
            className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {loading ? "Loggar ut..." : "Logga ut"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Link href="/players" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-3xl">👥</div>
            <h2 className="mt-3 text-xl font-bold text-gray-800">Spelare</h2>
            <p className="mt-2 text-sm text-gray-600">Skapa och radera spelare.</p>
          </Link>

          <Link href="/weeks" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-3xl">📅</div>
            <h2 className="mt-3 text-xl font-bold text-gray-800">Veckor</h2>
            <p className="mt-2 text-sm text-gray-600">Hantera veckor, deltagare och matchgenerering.</p>
          </Link>

          <Link href="/games" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-3xl">🎮</div>
            <h2 className="mt-3 text-xl font-bold text-gray-800">Matcher</h2>
            <p className="mt-2 text-sm text-gray-600">Redigera matcher och rapportera resultat.</p>
          </Link>

          <Link href="/standings/weekly" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-3xl">🎯</div>
            <h2 className="mt-3 text-xl font-bold text-gray-800">Veckoställning</h2>
            <p className="mt-2 text-sm text-gray-600">Se poäng och placering för vald vecka.</p>
          </Link>

          <Link href="/standings/season" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-3xl">🏆</div>
            <h2 className="mt-3 text-xl font-bold text-gray-800">Säsong</h2>
            <p className="mt-2 text-sm text-gray-600">Se totalställning med borttagna veckor.</p>
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          Publik vy finns pa <Link href="/public" className="font-semibold underline">/public</Link>.
        </div>
      </div>
    </main>
  );
}
