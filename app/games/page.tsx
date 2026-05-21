"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Player {
  id: number;
  name: string;
}

interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  rounds: number;
  weekComplete: boolean;
  hasMatches?: boolean;
  hasWeeklyStandings?: boolean;
  days: Array<{ id: number; dayNumber: number }>;
  participants: Array<{ id: number; playerId: number; player: Player }>;
}

interface GameTeam {
  id: number;
  team: number;
  playerId: number;
  player: Player;
}

interface Game {
  id: number;
  roundNumber: number;
  gameNumber: number;
  team1Score: number | null;
  team2Score: number | null;
  day: { id: number; weekId: number };
  teams: GameTeam[];
}

type ScoreDrafts = Record<number, { team1Score: string; team2Score: string }>;

type MatchEditorMode = "closed" | "create" | "edit";

type MatchFormState = {
  roundNumber: string;
  gameNumber: string;
  team1Player1: string;
  team1Player2: string;
  team2Player1: string;
  team2Player2: string;
};

function formatHalfValue(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("sv-SE")
    : value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function createEmptyMatchForm(gameNumber: number, roundNumber: number): MatchFormState {
  return {
    roundNumber: roundNumber.toString(),
    gameNumber: gameNumber.toString(),
    team1Player1: "",
    team1Player2: "",
    team2Player1: "",
    team2Player2: "",
  };
}

function createMatchFormFromGame(game: Game): MatchFormState {
  const team1 = game.teams.filter((team) => team.team === 1);
  const team2 = game.teams.filter((team) => team.team === 2);

  return {
    roundNumber: game.roundNumber.toString(),
    gameNumber: game.gameNumber.toString(),
    team1Player1: team1[0]?.playerId.toString() ?? "",
    team1Player2: team1[1]?.playerId.toString() ?? "",
    team2Player1: team2[0]?.playerId.toString() ?? "",
    team2Player2: team2[1]?.playerId.toString() ?? "",
  };
}

export default function GamesPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matchEditorMode, setMatchEditorMode] = useState<MatchEditorMode>("closed");
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [matchForm, setMatchForm] = useState<MatchFormState>(createEmptyMatchForm(1, 1));
  const [savingMatch, setSavingMatch] = useState(false);

  useEffect(() => {
    void fetchWeeks();
  }, []);

  useEffect(() => {
    if (!selectedWeekId) {
      return;
    }

    void fetchGames(selectedWeekId);
  }, [selectedWeekId]);

  const selectedWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) ?? null,
    [selectedWeekId, weeks]
  );

  const isWeekComplete = Boolean(selectedWeek?.weekComplete);

  const availablePlayers = useMemo(
    () => selectedWeek?.participants.map((participant) => participant.player) ?? [],
    [selectedWeek]
  );

  const maxRoundNumber = useMemo(() => {
    const maxGameRound = games.reduce((highest, game) => Math.max(highest, game.roundNumber), 0);
    if (maxGameRound === 0) return 0;
    return Math.max(selectedWeek?.rounds ?? 0, maxGameRound);
  }, [games, selectedWeek]);

  const hasUnsavedChanges = useMemo(() => {
    return games.some((game) => {
      const draft = scoreDrafts[game.id];
      if (!draft) {
        return false;
      }

      const draftTeam1 = draft.team1Score === "" ? null : Number(draft.team1Score);
      const draftTeam2 = draft.team2Score === "" ? null : Number(draft.team2Score);

      return draftTeam1 !== game.team1Score || draftTeam2 !== game.team2Score;
    });
  }, [games, scoreDrafts]);

  const rounds = useMemo(() => {
    if (!selectedWeek) {
      return [] as Array<{ roundNumber: number; games: Game[]; restingPlayers: Player[] }>;
    }

    const roundsMap = new Map<number, Game[]>();

    for (const game of games) {
      const list = roundsMap.get(game.roundNumber) ?? [];
      list.push(game);
      roundsMap.set(game.roundNumber, list);
    }

    return Array.from({ length: maxRoundNumber }, (_, index) => {
      const roundNumber = index + 1;
      const roundGames = roundsMap.get(roundNumber) ?? [];
      const activeIds = new Set(roundGames.flatMap((game) => game.teams.map((team) => team.playerId)));
      const restingPlayers = selectedWeek.participants
        .map((participant) => participant.player)
        .filter((player) => !activeIds.has(player.id));

      return {
        roundNumber,
        games: roundGames,
        restingPlayers: restingPlayers.sort((left, right) => left.name.localeCompare(right.name, "sv")),
      };
    });
  }, [games, maxRoundNumber, selectedWeek]);

  function selectWeek(weekId: number | null) {
    setSelectedWeekId(weekId);
    setMatchEditorMode("closed");
    setEditingGameId(null);
  }

  async function fetchWeeks() {
    try {
      const response = await fetch("/api/weeks?activity=1");
      const data = await response.json();
      const nextWeeks = Array.isArray(data) ? data : [];
      setWeeks(nextWeeks);
      setSelectedWeekId((current) => {
        if (nextWeeks.length === 0) {
          setMatchEditorMode("closed");
          setEditingGameId(null);
          return null;
        }
        if (current && nextWeeks.some((week) => week.id === current)) {
          return current;
        }

        const latestActiveWeek = [...nextWeeks]
          .reverse()
          .find((week) => week.hasMatches || week.hasWeeklyStandings);

        setMatchEditorMode("closed");
        setEditingGameId(null);
        return latestActiveWeek?.id ?? nextWeeks[nextWeeks.length - 1].id;
      });
    } catch (fetchError) {
      console.error("Failed to fetch weeks:", fetchError);
      setError("Misslyckades att hämta veckor.");
    }
  }

  async function fetchGames(weekId: number) {
    try {
      const response = await fetch(`/api/games?weekId=${weekId}`);
      const data = await response.json();
      const nextGames = Array.isArray(data) ? data : [];
      setGames(nextGames);
      setScoreDrafts(
        Object.fromEntries(
          nextGames.map((game) => [
            game.id,
            {
              team1Score: game.team1Score?.toString() ?? "",
              team2Score: game.team2Score?.toString() ?? "",
            },
          ])
        )
      );
    } catch (fetchError) {
      console.error("Failed to fetch games:", fetchError);
      setError("Misslyckades att hämta matcher.");
    }
  }

  function updateDraft(gameId: number, field: "team1Score" | "team2Score", value: string) {
    setScoreDrafts((current) => ({
      ...current,
      [gameId]: {
        team1Score: current[gameId]?.team1Score ?? "",
        team2Score: current[gameId]?.team2Score ?? "",
        [field]: value,
      },
    }));
  }

  function updateMatchForm(field: keyof MatchFormState, value: string) {
    setMatchForm((current) => ({ ...current, [field]: value }));
  }

  function beginAddMatch() {
    if (isWeekComplete) {
      setError("Veckan är markerad som klar. Matcher och resultat är låsta.");
      return;
    }

    const nextGameNumber = games.reduce((highest, game) => Math.max(highest, game.gameNumber), 0) + 1;
    setMatchEditorMode("create");
    setEditingGameId(null);
    setMatchForm(createEmptyMatchForm(nextGameNumber, maxRoundNumber));
    setError("");
  }

  function beginEditMatch(game: Game) {
    if (isWeekComplete) {
      setError("Veckan är markerad som klar. Matcher och resultat är låsta.");
      return;
    }

    setMatchEditorMode("edit");
    setEditingGameId(game.id);
    setMatchForm(createMatchFormFromGame(game));
    setError("");
  }

  function cancelMatchEditor() {
    setMatchEditorMode("closed");
    setEditingGameId(null);
    setMatchForm(createEmptyMatchForm(1, 1));
  }

  async function handleSaveMatch() {
    if (!selectedWeek) {
      return;
    }

    if (isWeekComplete) {
      setError("Veckan är markerad som klar. Matcher och resultat är låsta.");
      return;
    }

    const dayId = selectedWeek.days[0]?.id;
    if (!dayId) {
      setError("Veckan saknar matchdag.");
      return;
    }

    const selectedPlayers = [
      matchForm.team1Player1,
      matchForm.team1Player2,
      matchForm.team2Player1,
      matchForm.team2Player2,
    ];

    if (selectedPlayers.some((playerId) => playerId === "")) {
      setError("Välj fyra spelare för matchen.");
      return;
    }

    if (new Set(selectedPlayers).size !== 4) {
      setError("En spelare kan bara vara med en gång i samma match.");
      return;
    }

    const roundNumber = Number(matchForm.roundNumber);
    const gameNumber = Number(matchForm.gameNumber);

    if (Number.isNaN(roundNumber) || Number.isNaN(gameNumber) || roundNumber < 1 || gameNumber < 1) {
      setError("Runda och matchnummer måste vara positiva tal.");
      return;
    }

    setSavingMatch(true);
    setError("");

    try {
      const payload = {
        dayId,
        roundNumber,
        gameNumber,
        team1Players: [Number(matchForm.team1Player1), Number(matchForm.team1Player2)],
        team2Players: [Number(matchForm.team2Player1), Number(matchForm.team2Player2)],
      };

      const response = await fetch(editingGameId ? `/api/games/${editingGameId}` : "/api/games", {
        method: editingGameId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save match");
      }

      await fetchGames(selectedWeek.id);
      cancelMatchEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Misslyckades att spara matchen.");
    } finally {
      setSavingMatch(false);
    }
  }

  async function handleDeleteMatch(gameId: number) {
    if (!selectedWeek) {
      return;
    }

    if (isWeekComplete) {
      setError("Veckan är markerad som klar. Matcher och resultat är låsta.");
      return;
    }

    if (!window.confirm("Vill du ta bort den här matchen?")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/games/${gameId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete match");
      }

      await fetchGames(selectedWeek.id);

      if (editingGameId === gameId) {
        cancelMatchEditor();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Misslyckades att ta bort matchen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAllResults() {
    if (!selectedWeek) {
      return;
    }

    if (isWeekComplete) {
      setError("Veckan är markerad som klar. Matcher och resultat är låsta.");
      return;
    }

    const incompleteGames = games.filter((game) => {
      const draft = scoreDrafts[game.id];
      if (!draft) {
        return false;
      }

      const hasTeam1 = draft.team1Score !== "";
      const hasTeam2 = draft.team2Score !== "";
      return (hasTeam1 && !hasTeam2) || (!hasTeam1 && hasTeam2);
    });

    if (incompleteGames.length > 0) {
      setError(
        `Ange poäng för båda lagen i match: ${incompleteGames
          .map((game) => game.gameNumber)
          .join(", ")}.`
      );
      return;
    }

    const gamesToSave = games.filter((game) => {
      const draft = scoreDrafts[game.id];
      if (!draft) {
        return false;
      }

      const draftTeam1 = draft.team1Score === "" ? null : Number(draft.team1Score);
      const draftTeam2 = draft.team2Score === "" ? null : Number(draft.team2Score);

      return draftTeam1 !== game.team1Score || draftTeam2 !== game.team2Score;
    });

    if (gamesToSave.length === 0) {
      setError("Inga nya resultat att spara.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      for (const game of gamesToSave) {
        const draft = scoreDrafts[game.id];
        if (!draft) {
          continue;
        }

        const updateResponse = await fetch(`/api/games/${game.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team1Score: draft.team1Score === "" ? null : Number(draft.team1Score),
            team2Score: draft.team2Score === "" ? null : Number(draft.team2Score),
            deferStandingsRebuild: true,
          }),
        });

        if (!updateResponse.ok) {
          const data = await updateResponse.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update game");
        }
      }

      const dayId = gamesToSave[0].day.id;

      const standingsResponse = await fetch("/api/standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId, weekId: selectedWeek.id }),
      });

      if (!standingsResponse.ok) {
        const data = await standingsResponse.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to recalculate standings");
      }

      await fetchGames(selectedWeek.id);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Misslyckades att spara resultaten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">🎮 Matcher</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={beginAddMatch}
              disabled={!selectedWeek || isWeekComplete}
              className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-400 disabled:opacity-50"
            >
              Lägg Till Match
            </button>
            <button
              type="button"
              onClick={() => void handleSaveAllResults()}
              disabled={loading || !selectedWeek || isWeekComplete || games.length === 0 || !hasUnsavedChanges}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? "Sparar..." : "Spara Alla Resultat"}
            </button>
            <Link href="/standings/weekly" className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400">
              Till Veckoställning
            </Link>
            <Link href="/" className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50">
              ← Till Startsidan
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {error && <div className="mb-6 rounded bg-red-100 p-3 text-red-700">{error}</div>}

        <div className="mb-8 flex gap-2 flex-wrap">
          {weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => selectWeek(week.id)}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                selectedWeekId === week.id ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-indigo-50"
              }`}
            >
              Vecka {week.weekNumber}
            </button>
          ))}
        </div>

        {selectedWeek && games.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-md">
            Inga matcher finns för vecka {selectedWeek.weekNumber} ännu. Generera dem under fliken Veckor.
          </div>
        )}

        {selectedWeek && isWeekComplete && (
          <div className="mb-6 rounded-lg bg-amber-50 p-4 text-amber-800 shadow-sm">
            Veckan är markerad som klar. Alla matcher och resultat är låsta för redigering.
          </div>
        )}

        <div className="space-y-4">
          {selectedWeek && !isWeekComplete && matchEditorMode !== "closed" && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {matchEditorMode === "edit" ? "Redigera Match" : "Lägg Till Match"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Justera lag och matchnummer manuellt när någon lämnar, blir skadad eller när du vill lägga till en extra match.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveMatch()}
                    disabled={savingMatch}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {savingMatch ? "Sparar..." : matchEditorMode === "edit" ? "Spara Match" : "Skapa Match"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelMatchEditor}
                    className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Avbryt
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Runda
                  <input
                    type="number"
                    min="1"
                    value={matchForm.roundNumber}
                    onChange={(event) => updateMatchForm("roundNumber", event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Matchnummer
                  <input
                    type="number"
                    min="1"
                    value={matchForm.gameNumber}
                    onChange={(event) => updateMatchForm("gameNumber", event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Lag 1 spelare 1
                  <select
                    value={matchForm.team1Player1}
                    onChange={(event) => updateMatchForm("team1Player1", event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Välj spelare</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Lag 1 spelare 2
                  <select
                    value={matchForm.team1Player2}
                    onChange={(event) => updateMatchForm("team1Player2", event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Välj spelare</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Lag 2 spelare 1
                  <select
                    value={matchForm.team2Player1}
                    onChange={(event) => updateMatchForm("team2Player1", event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Välj spelare</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Lag 2 spelare 2
                  <select
                    value={matchForm.team2Player2}
                    onChange={(event) => updateMatchForm("team2Player2", event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Välj spelare</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {rounds.map((round) => (
            <div key={round.roundNumber} className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-xl font-bold text-gray-800">Runda {round.roundNumber}</h3>
                <div className="text-sm text-gray-600">
                  {round.restingPlayers.length > 0
                    ? `Vilar: ${round.restingPlayers.map((player) => player.name).join(", ")}`
                    : "Ingen vila denna runda"}
                </div>
              </div>

              <div className="space-y-4">
                {round.games.map((game) => {
                  const team1 = game.teams.filter((team) => team.team === 1);
                  const team2 = game.teams.filter((team) => team.team === 2);
                  const isDraw = game.team1Score !== null && game.team2Score !== null && game.team1Score === game.team2Score;

                  return (
                    <div key={game.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Match {game.gameNumber}</div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-500">
                            {game.team1Score !== null && game.team2Score !== null
                              ? isDraw
                                ? `Oavgjort: ${formatHalfValue(0.5)} vinst / ${formatHalfValue(0.5)} förlust per spelare`
                                : "Resultat registrerat"
                              : "Väntar på resultat"}
                          </div>
                          <button
                            type="button"
                            onClick={() => beginEditMatch(game)}
                            disabled={isWeekComplete}
                            className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
                          >
                            Redigera
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteMatch(game.id)}
                            disabled={isWeekComplete}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
                          >
                            Ta Bort
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Lag 1</p>
                          <p className="mt-1 font-semibold text-gray-900">{team1.map((team) => team.player.name).join(" / ")}</p>
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={scoreDrafts[game.id]?.team1Score ?? ""}
                          onChange={(event) => updateDraft(game.id, "team1Score", event.target.value)}
                          disabled={isWeekComplete}
                          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        <div>
                          <p className="text-sm font-medium text-gray-500">Lag 2</p>
                          <p className="mt-1 font-semibold text-gray-900">{team2.map((team) => team.player.name).join(" / ")}</p>
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={scoreDrafts[game.id]?.team2Score ?? ""}
                          onChange={(event) => updateDraft(game.id, "team2Score", event.target.value)}
                          disabled={isWeekComplete}
                          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
