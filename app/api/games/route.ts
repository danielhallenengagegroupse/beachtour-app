import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebuildSeasonStandings, rebuildWeekStandings } from "@/lib/standings";

function hasDuplicatePlayers(playerIds: number[]) {
  return new Set(playerIds).size !== playerIds.length;
}

export async function POST(request: NextRequest) {
  try {
    const { dayId, roundNumber, gameNumber, team1Players, team2Players, team1Score, team2Score } =
      await request.json();

    if (
      !dayId ||
      !gameNumber ||
      !team1Players ||
      !team2Players
    ) {
      return NextResponse.json(
        {
          error:
            "dayId, gameNumber, team1Players, and team2Players are required",
        },
        { status: 400 }
      );
    }

    // Validate team sizes (should be 2 players each for 2v2)
    if (team1Players.length !== 2 || team2Players.length !== 2) {
      return NextResponse.json(
        { error: "Each team must have exactly 2 players" },
        { status: 400 }
      );
    }

    const parsedDayId = Number(dayId);
    const parsedRoundNumber = Number(roundNumber ?? 1);
    const parsedGameNumber = Number(gameNumber);
    const parsedTeam1Players = team1Players.map((playerId: number) => Number(playerId));
    const parsedTeam2Players = team2Players.map((playerId: number) => Number(playerId));
    const allPlayers = [...parsedTeam1Players, ...parsedTeam2Players];

    if (
      Number.isNaN(parsedDayId) ||
      Number.isNaN(parsedRoundNumber) ||
      Number.isNaN(parsedGameNumber) ||
      parsedRoundNumber < 1 ||
      parsedGameNumber < 1
    ) {
      return NextResponse.json(
        { error: "dayId, roundNumber and gameNumber must be valid positive numbers" },
        { status: 400 }
      );
    }

    if (allPlayers.some((playerId) => Number.isNaN(playerId)) || hasDuplicatePlayers(allPlayers)) {
      return NextResponse.json(
        { error: "Each match must contain four unique players" },
        { status: 400 }
      );
    }

    const game = await prisma.$transaction(async (tx) => {
      const day = await tx.day.findUnique({
        where: { id: parsedDayId },
        select: { id: true, weekId: true },
      });

      if (!day) {
        throw new Error("DAY_NOT_FOUND");
      }

      const week = await tx.week.findUnique({
        where: { id: day.weekId },
        select: { weekComplete: true },
      });

      if (week?.weekComplete) {
        throw new Error("WEEK_COMPLETE");
      }

      const createdGame = await tx.game.create({
        data: {
          dayId: parsedDayId,
          roundNumber: parsedRoundNumber,
          gameNumber: parsedGameNumber,
          team1Score: team1Score ?? null,
          team2Score: team2Score ?? null,
          winnerId: null,
          teams: {
            create: [
              ...parsedTeam1Players.map((playerId: string) => ({
                playerId,
                team: 1,
              })),
              ...parsedTeam2Players.map((playerId: string) => ({
                playerId,
                team: 2,
              })),
            ],
          },
        },
        include: {
          teams: { include: { player: true } },
          day: true,
        },
      });

      await rebuildWeekStandings(tx, day.weekId);
      await rebuildSeasonStandings(tx);

      return createdGame;
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("Error creating game:", error);
    if (error instanceof Error && error.message === "DAY_NOT_FOUND") {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "WEEK_COMPLETE") {
      return NextResponse.json({ error: "Week is complete and matches are locked" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dayId = searchParams.get("dayId");
    const weekId = searchParams.get("weekId");

    let where = {};

    if (dayId) {
      where = { dayId: parseInt(dayId) };
    } else if (weekId) {
      where = { day: { weekId: parseInt(weekId) } };
    }

    const games = await prisma.game.findMany({
      where,
      include: {
        teams: {
          include: {
            player: true,
          },
        },
        day: true,
      },
      orderBy: [{ roundNumber: "asc" }, { gameNumber: "asc" }],
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
