import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-[#1e2a4a] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Image src="/logo.png" alt="Bjärke Summer Beach Tour 2026" width={400} height={80} className="object-contain" priority />
            <p className="mt-1 text-sm font-semibold tracking-wide text-white/80">VK Bjärke Beachvolley Summer Tour 2026</p>
          </div>
          <Link href="/admin/login" className="bg-white text-[#1e2a4a] px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
            Admin login
          </Link>
        </div>
      </header>

      {/* Navigation and Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/public" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 h-full">
              <div className="text-3xl mb-4">🌞</div>
              <h2 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                Publik Vy
              </h2>
              <p className="text-gray-600 text-sm mt-2">Matcher, veckoställning och säsongsställning i läsläge.</p>
            </div>
          </Link>

          <Link href="/admin" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 h-full">
              <div className="text-3xl mb-4">🛠️</div>
              <h2 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                Adminpanel
              </h2>
              <p className="text-gray-600 text-sm mt-2">Hantera spelare, veckor och matcher med inloggning.</p>
            </div>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upplägg</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-indigo-600 mb-2">1. Publik vy</h3>
              <p className="text-gray-600">
                Delas med deltagare och publik. Innehåller bara matcher och ställningar.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-600 mb-2">2. Adminpanel</h3>
              <p className="text-gray-600">
                Kräver inloggning och används för all redigering och planering.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-600 mb-2">3. API-skydd</h3>
              <p className="text-gray-600">
                Skrivande API-anrop kräver admin-inloggning. Läsning är fortsatt publik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
