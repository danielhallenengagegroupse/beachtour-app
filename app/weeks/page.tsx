"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Player {
  id: number;
  name: string;
}

interface WeekParticipant {
  id: number;
  playerId: number;
  player: Player;
}

interface Day {
  id: number;
}

interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  rounds: number;
  rainyDay: boolean;
  weekComplete: boolean;
  participants: WeekParticipant[];
  days: Day[];
}

interface UnknownPlayerPrompt {
  name: string;
  remaining: string[];
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function WeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameCount, setGameCount] = useState(0);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [roundsForGeneration, setRoundsForGeneration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calendar import state
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [unknownPlayerPrompt, setUnknownPlayerPrompt] = useState<UnknownPlayerPrompt | null>(null);

  const [weekForm, setWeekForm] = useState({
    weekNumber: "",
    date: "",
  });

  useEffect(() => {
    void Promise.all([fetchWeeks(), fetchPlayers()]);
  }, []);

  useEffect(() => {
    if (!selectedWeekId) {
      return;
    }

    void fetchGameCount(selectedWeekId);
  }, [selectedWeekId]);

  function selectWeek(weekId: number | null) {
    setSelectedWeekId(weekId);
    setRoundsForGeneration("");
    if (weekId === null) {
      setGameCount(0);
    }
  }

  const selectedWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) ?? null,
    [selectedWeekId, weeks]
  );

  const availablePlayers = useMemo(() => {
    if (!selectedWeek) {
      return players;
    }

    const existingIds = new Set(selectedWeek.participants.map((participant) => participant.playerId));
    return players.filter((player) => !existingIds.has(player.id));
  }, [players, selectedWeek]);

  async function fetchWeeks() {
    try {
      const response = await fetch("/api/weeks");
      const data = await response.json();
      const nextWeeks = Array.isArray(data) ? data : [];
      setWeeks(nextWeeks);
      setSelectedWeekId((current) => {
        if (nextWeeks.length === 0) {
          setRoundsForGeneration("");
          setGameCount(0);
          return null;
        }

        if (current && nextWeeks.some((week) => week.id === current)) {
          return current;
        }

        setRoundsForGeneration("");
        return nextWeeks[nextWeeks.length - 1].id;
      });
    } catch (fetchError) {
      console.error("Failed to fetch weeks:", fetchError);
      setError("Misslyckades att hämta veckor.");
    }
  }

  async function fetchPlayers() {
    try {
      const response = await fetch("/api/players");
      const data = await response.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error("Failed to fetch players:", fetchError);
      setError("Misslyckades att hämta spelare.");
    }
  }

  async function fetchGameCount(weekId: number) {
    try {
      const response = await fetch(`/api/games?weekId=${weekId}`);
      const data = await response.json();
      setGameCount(Array.isArray(data) ? data.length : 0);
    } catch (fetchError) {
      console.error("Failed to fetch game count:", fetchError);
      setError("Misslyckades att hämta matcher.");
    }
  }

  async function handleCreateWeek(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/weeks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekNumber: Number(weekForm.weekNumber),
          date: new Date(weekForm.date).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create week");
      }

      setWeekForm({ weekNumber: "", date: "" });
      await fetchWeeks();
    } catch (createError) {
      console.error(createError);
      setError(createError instanceof Error ? createError.message : "Misslyckades att skapa veckan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWeek() {
    if (!selectedWeek) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/weeks?weekId=${selectedWeek.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete week");
      }

      await fetchWeeks();
    } catch (deleteError) {
      console.error(deleteError);
      setError("Misslyckades att radera veckan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRainyDayChange(rainyDayValue: "yes" | "no") {
    if (!selectedWeek) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/weeks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: selectedWeek.id,
          rainyDay: rainyDayValue === "yes",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update rainy day setting");
      }

      await fetchWeeks();
    } catch (updateError) {
      console.error(updateError);
      setError("Misslyckades att uppdatera regndag-inställningen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWeekCompleteChange(weekCompleteValue: "yes" | "no") {
    if (!selectedWeek) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/weeks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: selectedWeek.id,
          weekComplete: weekCompleteValue === "yes",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update week complete setting");
      }

      await fetchWeeks();
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : "Misslyckades att uppdatera vecka klar-inställningen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPlayerToWeek() {
    if (!selectedWeek || !selectedPlayerId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/week-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: selectedWeek.id, playerId: Number(selectedPlayerId) }),
      });

      if (!response.ok) {
        throw new Error("Failed to add player to week");
      }

      setSelectedPlayerId("");
      await fetchWeeks();
    } catch (addError) {
      console.error(addError);
      setError("Misslyckades att lägga till spelare i veckan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePlayerFromWeek(playerId: number) {
    if (!selectedWeek) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/week-participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: selectedWeek.id, playerId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove player from week");
      }

      await fetchWeeks();
    } catch (removeError) {
      console.error(removeError);
      setError("Misslyckades att ta bort spelaren från veckan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateGames() {
    if (!selectedWeek) {
      return;
    }

    const rounds = Number(roundsForGeneration);
    if (!roundsForGeneration || Number.isNaN(rounds) || rounds < 1) {
      setError("Ange antal rundor (minst 1) innan matcher genereras.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: selectedWeek.id, rounds, forceRegenerate: false }),
      });

      if (!response.ok) {
        const data = await response.json();

        if (response.status === 409 && data.hasReportedResults) {
          const shouldReplace = window.confirm(
            "Det finns redan registrerade resultat. Vill du radera dessa matcher och skapa ett nytt schema?"
          );

          if (!shouldReplace) {
            return;
          }

          response = await fetch("/api/games/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weekId: selectedWeek.id, rounds, forceRegenerate: true }),
          });

          if (!response.ok) {
            const retryData = await response.json().catch(() => ({}));
            throw new Error(retryData.error ?? "Failed to generate games");
          }
        } else {
          throw new Error(data.error ?? "Failed to generate games");
        }
      }

      await Promise.all([fetchGameCount(selectedWeek.id), fetchWeeks()]);
    } catch (generationError) {
      console.error(generationError);
      setError(generationError instanceof Error ? generationError.message : "Misslyckades att generera matcher.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoImportFromCalendar() {
    if (!selectedWeek) {
      return;
    }

    setCalendarLoading(true);
    setCalendarError("");

    try {
      const response = await fetch("/api/calendar-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekDate: selectedWeek.startDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Misslyckades att hämta deltagare.");
      }

      const importedNames: string[] = Array.isArray(data.names) ? data.names : [];

      if (importedNames.length === 0) {
        setCalendarError("Inga anmälda deltagare hittades för veckans datum i kalendern.");
        setCalendarLoading(false);
        return;
      }

      await processImportedNames(importedNames);
    } catch (importError) {
      setCalendarError(importError instanceof Error ? importError.message : "Okänt fel.");
      setCalendarLoading(false);
    }
  }

  async function processImportedNames(names: string[]) {
    if (!selectedWeek || names.length === 0) {
      await Promise.all([fetchWeeks(), fetchPlayers()]);
      setUnknownPlayerPrompt(null);
      setCalendarLoading(false);
      return;
    }

    const [name, ...remaining] = names;

    const currentPlayers = await fetch("/api/players").then((response) => response.json() as Promise<Player[]>);
    const currentWeek = await fetch("/api/weeks")
      .then((response) => response.json() as Promise<Week[]>)
      .then((allWeeks) => allWeeks.find((week) => week.id === selectedWeek.id));

    const existing = currentPlayers.find(
      (player) => normalizeName(player.name) === normalizeName(name)
    );

    if (existing) {
      const alreadyInWeek = new Set(currentWeek?.participants.map((participant) => participant.playerId) ?? []);

      if (!alreadyInWeek.has(existing.id)) {
        const addResponse = await fetch("/api/week-participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekId: selectedWeek.id, playerId: existing.id }),
        });

        if (!addResponse.ok) {
          const data = await addResponse.json().catch(() => ({}));
          throw new Error(data.error ?? `Kunde inte lagga till spelaren ${existing.name}.`);
        }
      }

      await processImportedNames(remaining);
      return;
    }

    setUnknownPlayerPrompt({ name, remaining });
  }

  async function handleRegisterUnknownPlayer() {
    if (!unknownPlayerPrompt || !selectedWeek) {
      return;
    }

    const name = unknownPlayerPrompt.name;
    const remaining = unknownPlayerPrompt.remaining;
    setUnknownPlayerPrompt(null);

    setLoading(true);
    setError("");

    const createRes = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!createRes.ok) {
      setError("Misslyckades att registrera spelaren.");
      setLoading(false);
      return;
    }

    const newPlayer: Player = await createRes.json();
    const addResponse = await fetch("/api/week-participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: selectedWeek.id, playerId: newPlayer.id }),
    });

    if (!addResponse.ok) {
      setError("Spelaren skapades men kunde inte laggas till i veckan.");
      setLoading(false);
      return;
    }

    setUnknownPlayerPrompt(null);
    setLoading(false);
    await processImportedNames(remaining);
  }

  async function handleSkipUnknownPlayer() {
    if (!unknownPlayerPrompt) {
      return;
    }

    const remaining = unknownPlayerPrompt.remaining;
    setUnknownPlayerPrompt(null);

    await processImportedNames(remaining);
  }

  return (
    <>
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">📅 Veckor</h1>
            <p className="mt-2 text-indigo-100">Skapa veckor, välj deltagare och auto-generera matcher.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/games" className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400">
              Till Matcher
            </Link>
            <Link href="https://beachtour.vkbjarke.se/admin" className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50">
              ← Till Startsidan
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {error && <div className="mb-6 rounded bg-red-100 p-3 text-red-700">{error}</div>}

        <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Skapa Ny Vecka</h2>

          <form onSubmit={handleCreateWeek} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="number"
              min="1"
              required
              value={weekForm.weekNumber}
              onChange={(event) => setWeekForm({ ...weekForm, weekNumber: event.target.value })}
              placeholder="Veckonummer"
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              required
              value={weekForm.date}
              onChange={(event) => setWeekForm({ ...weekForm, date: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Sparar..." : "Skapa Vecka"}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="bg-indigo-600 px-6 py-4 text-white">
                <h3 className="font-bold">Veckor</h3>
              </div>
              <div className="divide-y">
                {weeks.map((week) => (
                  <button
                    key={week.id}
                    onClick={() => selectWeek(week.id)}
                    className={`w-full px-6 py-4 text-left hover:bg-indigo-50 ${selectedWeek?.id === week.id ? "border-l-4 border-indigo-600 bg-indigo-100" : ""}`}
                  >
                    <div className="font-medium text-gray-900">Vecka {week.weekNumber}</div>
                    <div className="mt-1 text-xs text-gray-500">{new Date(week.startDate).toLocaleDateString("sv-SE")}</div>
                    <div className="mt-2 text-xs text-gray-600">{week.rounds} rundor • {week.participants.length} spelare</div>
                    <div className="mt-1 text-xs text-gray-600">Regndag: {week.rainyDay ? "Ja" : "Nej"}</div>
                    <div className="mt-1 text-xs text-gray-600">Vecka klar: {week.weekComplete ? "Ja" : "Nej"}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {selectedWeek && (
            <section className="space-y-6 lg:col-span-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <p className="text-sm font-medium text-gray-500">Speldatum</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{new Date(selectedWeek.startDate).toLocaleDateString("sv-SE")}</p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <p className="text-sm font-medium text-gray-500">Antal rundor</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedWeek.rounds}</p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <p className="text-sm font-medium text-gray-500">Deltagare</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedWeek.participants.length}</p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <p className="text-sm font-medium text-gray-500">Genererade matcher</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{gameCount}</p>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Regndag</h3>
                    <p className="mt-1 text-sm text-gray-500">Om veckan markeras som regndag dubblas rankingpoängen för den veckan.</p>
                  </div>
                  <select
                    value={selectedWeek.rainyDay ? "yes" : "no"}
                    onChange={(event) => void handleRainyDayChange(event.target.value as "yes" | "no")}
                    disabled={loading}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="no">Nej</option>
                    <option value="yes">Ja</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Vecka klar</h3>
                    <p className="mt-1 text-sm text-gray-500">När en vecka markeras som klar låses alla matcher och resultat för veckan.</p>
                  </div>
                  <select
                    value={selectedWeek.weekComplete ? "yes" : "no"}
                    onChange={(event) => void handleWeekCompleteChange(event.target.value as "yes" | "no")}
                    disabled={loading}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="no">Nej</option>
                    <option value="yes">Ja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                <div className="rounded-lg bg-white p-6 shadow-md xl:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Lägg till spelare</h3>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">Vecka {selectedWeek.weekNumber}</span>
                  </div>

                  <div className="flex gap-3">
                    <select
                      value={selectedPlayerId}
                      onChange={(event) => setSelectedPlayerId(event.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Välj registrerad spelare</option>
                      {availablePlayers.map((player) => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAddPlayerToWeek()}
                      disabled={loading || !selectedPlayerId}
                      className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Lägg till
                    </button>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => { setCalendarError(""); void handleAutoImportFromCalendar(); }}
                      disabled={calendarLoading}
                      className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      📅 Hämta deltagare
                    </button>
                  </div>

                  {calendarLoading && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Söker i kalender...
                    </div>
                  )}

                  {calendarError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {calendarError}
                    </div>
                  )}

                  <div className="mt-6 space-y-3">
                    {selectedWeek.participants.length === 0 ? (
                      <p className="text-sm text-gray-500">Inga spelare tillagda ännu.</p>
                    ) : (
                      selectedWeek.participants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                          <span className="font-medium text-gray-800">{participant.player.name}</span>
                          <button
                            type="button"
                            onClick={() => void handleRemovePlayerFromWeek(participant.playerId)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Ta bort
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                </div>

                <div className="rounded-lg bg-white p-6 shadow-md xl:col-span-3">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Auto-generera matcher</h3>
                      <p className="mt-1 text-sm text-gray-500">Auto-genereringen ligger kvar under veckor, men de skapade matcherna hanteras under fliken Matcher.</p>
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={roundsForGeneration}
                        onChange={(event) => setRoundsForGeneration(event.target.value)}
                        placeholder="Antal rundor *"
                        disabled={selectedWeek.weekComplete}
                        className="w-44 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <Link href="/games" className="rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 hover:bg-gray-200">
                        Öppna Matcher
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleGenerateGames()}
                        disabled={loading || selectedWeek.weekComplete || selectedWeek.participants.length < 4 || !roundsForGeneration}
                        className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {loading ? "Arbetar..." : "Generera Matcher"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-800">
                    Minst 4 registrerade spelare krävs. Högst 16 spelare spelar per runda, vilket ger max fyra matcher. Övriga spelare hamnar på väntelistan.
                  </div>

                  {selectedWeek.weekComplete && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                      Veckan är markerad som klar. Matchschema och resultat är låsta.
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleDeleteWeek()}
                      disabled={loading}
                      className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Radera vecka
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>

    {/* Unknown player confirmation modal */}
    {unknownPlayerPrompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
          <h2 className="mb-3 text-xl font-bold text-gray-900">Okänd spelare</h2>
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-indigo-700">{unknownPlayerPrompt.name}</span> finns inte registrerad
            som spelare ännu. Vill du registrera {unknownPlayerPrompt.name} som spelare och lägga till i veckan?
          </p>
          {unknownPlayerPrompt.remaining.length > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              {unknownPlayerPrompt.remaining.length} namn kvar att bearbeta efter detta.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => void handleSkipUnknownPlayer()}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hoppa över
            </button>
            <button
              type="button"
              onClick={() => void handleRegisterUnknownPlayer()}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Registrera och lägg till
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
