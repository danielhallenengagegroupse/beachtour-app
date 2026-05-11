import Link from "next/link";
import Image from "next/image";

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-[#1e2a4a] text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <div>
            <Image src="/logo.png" alt="Bjärke Summer Beach Tour 2026" width={400} height={80} className="object-contain" priority />
            <p className="mt-1 text-sm font-semibold tracking-wide text-white/80">VK Bjärke Beachvolley Summer Tour 2026</p>
          </div>
          <Link href="/admin/login" className="rounded-lg bg-white px-4 py-2 font-medium text-[#1e2a4a] hover:bg-gray-100">
            Admin login
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 md:grid-cols-3">
        <Link href="/public/matches" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
          <div className="text-3xl">🎮</div>
          <h2 className="mt-3 text-xl font-bold text-gray-800">Matcher</h2>
          <p className="mt-2 text-sm text-gray-600">Se alla matcher och resultat.</p>
        </Link>

        <Link href="/standings/weekly" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
          <div className="text-3xl">🎯</div>
          <h2 className="mt-3 text-xl font-bold text-gray-800">Veckoställning</h2>
          <p className="mt-2 text-sm text-gray-600">Följ ranking och poäng vecka för vecka.</p>
        </Link>

        <Link href="/standings/season" className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
          <div className="text-3xl">🏆</div>
          <h2 className="mt-3 text-xl font-bold text-gray-800">Säsongställning</h2>
          <p className="mt-2 text-sm text-gray-600">Se totalen för hela Bjärke Summer Beach Tour 2026.</p>
        </Link>
      </div>
    </main>
  );
}
