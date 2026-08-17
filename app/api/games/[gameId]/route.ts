import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebuildSeasonStandings, rebuildWeekStandings } from "@/lib/standings";

type RouteContext = {
  params: Promise<{ gameId: string }>;
};

function hasDuplicatePlayers(playerIds: number[]) {
  return new Set(playerIds).size !== playerIds.length;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { gameId } = await context.params;
    const { team1Score, team2Score, roundNumber, gameNumber, team1Players, team2Players, deferStandingsRebuild } =
      await request.json();

    const hasScoreUpdate = team1Score !== undefined || team2Score !== undefined;
    const hasStructureUpdate =
      roundNumber !== undefined || gameNumber !== undefined || team1Players !== undefined || team2Players !== undefined;

    if (!hasScoreUpdate && !hasStructureUpdate) {
      return NextResponse.json({ error: "No game updates were provided" }, { status: 400 });
    }

    if (hasScoreUpdate && (team1Score === undefined || team2Score === undefined)) {
      return NextResponse.json({ error: "team1Score and team2Score are required" }, { status: 400 });
    }

    if ((team1Players === undefined) !== (team2Players === undefined)) {
      return NextResponse.json({ error: "Both teams must be provided when editing players" }, { status: 400 });
    }

    if (team1Players !== undefined && (team1Players.length !== 2 || team2Players.length !== 2)) {
      return NextResponse.json({ error: "Each team must have exactly 2 players" }, { status: 400 });
    }

    if (team1Players !== undefined) {
      const allPlayers = [...team1Players, ...team2Players].map((playerId: number) => Number(playerId));
      if (allPlayers.some((playerId) => Number.isNaN(playerId)) || hasDuplicatePlayers(allPlayers)) {
        return NextResponse.json({ error: "Each match must contain four unique players" }, { status: 400 });
      }
    }

    const parsedTeam1Score = team1Score === null ? null : Number(team1Score);
    const parsedTeam2Score = team2Score === null ? null : Number(team2Score);

    if (hasScoreUpdate) {
      if (
        (parsedTeam1Score !== null && Number.isNaN(parsedTeam1Score)) ||
        (parsedTeam2Score !== null && Number.isNaN(parsedTeam2Score))
      ) {
        return NextResponse.json({ error: "Scores must be numbers" }, { status: 400 });
      }

      if ((parsedTeam1Score === null) !== (parsedTeam2Score === null)) {
        return NextResponse.json({ error: "Both scores must be provided or both must be blank" }, { status: 400 });
      }
    }

    const parsedRoundNumber = roundNumber === undefined ? undefined : Number(roundNumber);
    const parsedGameNumber = gameNumber === undefined ? undefined : Number(gameNumber);

    if (
      (parsedRoundNumber !== undefined && (Number.isNaN(parsedRoundNumber) || parsedRoundNumber < 1)) ||
      (parsedGameNumber !== undefined && (Number.isNaN(parsedGameNumber) || parsedGameNumber < 1))
    ) {
      return NextResponse.json({ error: "roundNumber and gameNumber must be positive numbers" }, { status: 400 });
    }

    const game = await prisma.$transaction(async (tx) => {
      const existingGame = await tx.game.findUnique({
        where: { id: parseInt(gameId) },
        include: { teams: true, day: true },
      });

      if (!existingGame) {
        throw new Error("GAME_NOT_FOUND");
      }

      const week = await tx.week.findUnique({
        where: { id: existingGame.day.weekId },
        select: { weekComplete: true, year: true },
      });

      if (week?.weekComplete) {
        throw new Error("WEEK_COMPLETE");
      }

      const playerUpdateRequested = team1Players !== undefined;
      const nextTeam1Players = playerUpdateRequested ? team1Players.map((playerId: number) => Number(playerId)) : [];
      const nextTeam2Players = playerUpdateRequested ? team2Players.map((playerId: number) => Number(playerId)) : [];
      const existingTeam1Players = existingGame.teams
        .filter((team) => team.team === 1)
        .map((team) => team.playerId)
        .sort((left, right) => left - right);
      const existingTeam2Players = existingGame.teams
        .filter((team) => team.team === 2)
        .map((team) => team.playerId)
        .sort((left, right) => left - right);
      const teamChangeRequested =
        playerUpdateRequested &&
        (existingTeam1Players.join(",") !== [...nextTeam1Players].sort((left, right) => left - right).join(",") ||
          existingTeam2Players.join(",") !== [...nextTeam2Players].sort((left, right) => left - right).join(","));

      if (playerUpdateRequested) {
        await tx.gameTeam.deleteMany({ where: { gameId: existingGame.id } });
      }

      const updatedGame = await tx.game.update({
        where: { id: existingGame.id },
        data: {
          roundNumber: parsedRoundNumber,
          gameNumber: parsedGameNumber,
          team1Score: hasScoreUpdate ? parsedTeam1Score : teamChangeRequested ? null : undefined,
          team2Score: hasScoreUpdate ? parsedTeam2Score : teamChangeRequested ? null : undefined,
          winnerId: null,
          teams: playerUpdateRequested
            ? {
                create: [
                  ...nextTeam1Players.map((playerId: string) => ({ playerId, team: 1 })),
                  ...nextTeam2Players.map((playerId: string) => ({ playerId, team: 2 })),
                ],
              }
            : undefined,
        },
        include: {
          teams: { include: { player: true } },
          day: true,
        },
      });

      if (!deferStandingsRebuild) {
        await rebuildWeekStandings(tx, existingGame.day.weekId);
        await rebuildSeasonStandings(tx, week?.year ?? 2026);
      }

      return updatedGame;
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json(game);
  } catch (error) {
    console.error("Error updating game:", error);
    if (error instanceof Error && error.message === "GAME_NOT_FOUND") {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "WEEK_COMPLETE") {
      return NextResponse.json({ error: "Week is complete and matches/results are locked" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { gameId } = await context.params;

    await prisma.$transaction(async (tx) => {
      const existingGame = await tx.game.findUnique({
        where: { id: parseInt(gameId) },
        include: { day: true },
      });

      if (!existingGame) {
        throw new Error("GAME_NOT_FOUND");
      }

      const weekForDelete = await tx.week.findUnique({
        where: { id: existingGame.day.weekId },
        select: { weekComplete: true, year: true },
      });

      if (weekForDelete?.weekComplete) {
        throw new Error("WEEK_COMPLETE");
      }

      await tx.game.delete({ where: { id: existingGame.id } });
      await rebuildWeekStandings(tx, existingGame.day.weekId);
      await rebuildSeasonStandings(tx, weekForDelete?.year ?? 2026);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting game:", error);
    if (error instanceof Error && error.message === "GAME_NOT_FOUND") {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "WEEK_COMPLETE") {
      return NextResponse.json({ error: "Week is complete and matches are locked" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to delete game" }, { status: 500 });
  }
}