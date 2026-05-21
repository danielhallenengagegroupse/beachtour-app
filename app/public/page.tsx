import Link from "next/link";

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="mx-auto grid max-w-3xl w-full grid-cols-1 gap-4 px-4 py-8 md:grid-cols-3 flex-1 items-start">
        <Link href="/public/matches" className="rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
          <div className="text-2xl">🎮</div>
          <h2 className="mt-2 text-base font-bold text-gray-800">Matcher</h2>
          <p className="mt-1 text-xs text-gray-600">Se alla matcher och resultat.</p>
        </Link>

        <Link href="/standings/weekly" className="rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
          <div className="text-2xl">🎯</div>
          <h2 className="mt-2 text-base font-bold text-gray-800">Veckoställning</h2>
          <p className="mt-1 text-xs text-gray-600">Följ ranking och poäng vecka för vecka.</p>
        </Link>

        <Link href="/standings/season" className="rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
          <div className="text-2xl">🏆</div>
          <h2 className="mt-2 text-base font-bold text-gray-800">Säsongställning</h2>
          <p className="mt-1 text-xs text-gray-600">Se totalen för hela Bjärke Summer Beach Tour 2026.</p>
        </Link>
      </div>

      <div className="flex justify-center pb-8">
        <Link href="/admin/login" className="rounded-lg bg-white px-4 py-2 font-medium text-gray-500 hover:bg-gray-100 text-sm shadow">
          Admin login
        </Link>
      </div>
    </main>
  );
}
