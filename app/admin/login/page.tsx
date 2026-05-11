import Link from "next/link";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeNextPath(value: string | string[] | undefined) {
  const nextPath = Array.isArray(value) ? value[0] : value;
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

function hasError(value: string | string[] | undefined) {
  const errorValue = Array.isArray(value) ? value[0] : value;
  return errorValue === "1";
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams.next);
  const showError = hasError(resolvedSearchParams.error);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
        <p className="mt-2 text-sm text-gray-600">Logga in för att komma till adminpanelen.</p>

        <form method="post" action="/api/admin/login-form" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          {showError && (
            <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">Fel anvandarnamn eller losenord.</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Anvandarnamn</label>
            <input
              name="username"
              type="text"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Losenord</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
            Logga in
          </button>
        </form>

        <Link href="/public" className="mt-6 block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Ga till publik vy
        </Link>
      </div>
    </main>
  );
}
