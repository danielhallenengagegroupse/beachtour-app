import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSchedule } from "@/lib/schedule";
import { rebuildSeasonStandings } from "@/lib/standings";

export async function POST(request: NextRequest) {
  try {
    const { weekId, rounds, forceRegenerate } = await request.json();

    if (!weekId) {
      return NextResponse.json({ error: "weekId is required" }, { status: 400 });
    }

    const roundsNumber = Number(rounds);

    if (!rounds || Number.isNaN(roundsNumber) || roundsNumber < 1) {
      return NextResponse.json({ error: "rounds is required and must be at least 1" }, { status: 400 });
    }

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        participants: { orderBy: { playerId: "asc" } },
      },
    });

    if (!week || week.days.length === 0) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    if (week.weekComplete) {
      return NextResponse.json({ error: "Week is complete and matches/results are locked" }, { status: 409 });
    }

    const playerIds = [...new Set(week.participants.map((participant) => participant.playerId))];

    if (playerIds.length < 4) {
      return NextResponse.json({ error: "At least 4 players must be added before games can be generated" }, { status: 400 });
    }

    const existingGames = await prisma.game.findMany({
      where: { dayId: week.days[0].id },
      select: { id: true, team1Score: true, team2Score: true },
    });

    const hasReportedResults = existingGames.some((game) => game.team1Score !== null || game.team2Score !== null);

    if (hasReportedResults && !forceRegenerate) {
      return NextResponse.json(
        {
          error: "Det finns redan registrerade resultat.",
          hasReportedResults: true,
        },
        { status: 409 }
      );
    }

    const schedule = generateSchedule(playerIds, roundsNumber);
    const dayId = week.days[0].id;

    await prisma.$transaction(async (tx) => {
      await tx.week.update({
        where: { id: week.id },
        data: { rounds: roundsNumber },
      });

      if (existingGames.length > 0) {
        await tx.game.deleteMany({ where: { dayId } });
      }

      let gameNumber = 1;

      for (const round of schedule) {
        for (const game of round.games) {
          await tx.game.create({
            data: {
              dayId,
              roundNumber: round.roundNumber,
              gameNumber,
              team1Score: null,
              team2Score: null,
              winnerId: null,
              teams: {
                create: [
                  { playerId: game.team1[0], team: 1 },
                  { playerId: game.team1[1], team: 1 },
                  { playerId: game.team2[0], team: 2 },
                  { playerId: game.team2[1], team: 2 },
                ],
              },
            },
          });

          gameNumber += 1;
        }
      }

      await tx.dailyRanking.deleteMany({ where: { dayId } });
      await tx.playerStanding.deleteMany({ where: { weekId } });
      await rebuildSeasonStandings(tx);
    }, { timeout: 30000, maxWait: 10000 });

    const games = await prisma.game.findMany({
      where: { dayId },
      include: {
        teams: { include: { player: true } },
      },
      orderBy: [{ roundNumber: "asc" }, { gameNumber: "asc" }],
    });

    return NextResponse.json({ schedule, games }, { status: 201 });
  } catch (error) {
    console.error("Error generating games:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate games: ${detail}` }, { status: 500 });
  }
}