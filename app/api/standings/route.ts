import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebuildSeasonStandings, rebuildWeekStandings } from "@/lib/standings";

function calculateWinPercentage(wins: number, gamesPlayed: number) {
  if (gamesPlayed === 0) {
    return 0;
  }

  return wins / gamesPlayed;
}

function calculateSeasonTotalWithTwoDropped(weekPoints: number[]) {
  const indexedPoints = weekPoints.map((points, index) => ({ points, index }));
  indexedPoints.sort((a, b) => {
    if (a.points !== b.points) {
      return a.points - b.points;
    }
    return a.index - b.index;
  });

  const droppedWeekIndexes = indexedPoints.slice(0, Math.min(2, indexedPoints.length)).map((entry) => entry.index);
  const dropped = droppedWeekIndexes.reduce((sum, index) => sum + weekPoints[index], 0);
  const total = weekPoints.reduce((sum, value) => sum + value, 0) - dropped;
  return { total, dropped, droppedWeekIndexes };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekId = searchParams.get("weekId");
    const dayId = searchParams.get("dayId");
    const type = searchParams.get("type") || "weekly"; // "daily" or "weekly" or "season"

    if (type === "daily" && dayId) {
      // Get daily standings for a specific day
      const dailyRankings = await prisma.dailyRanking.findMany({
        where: { dayId: parseInt(dayId) },
        include: { player: true },
        orderBy: { rank: "asc" },
      });

      return NextResponse.json(dailyRankings);
    } else if (type === "weekly" && weekId) {
      // Get weekly standings
      const standings = await prisma.playerStanding.findMany({
        where: { weekId: parseInt(weekId) },
        include: { player: true },
      });

      const sortedStandings = standings
        .map((standing) => ({
          ...standing,
          winPercentage: calculateWinPercentage(standing.wins, standing.gamesPlayed),
        }))
        .sort((left, right) => {
          if (right.totalPoints !== left.totalPoints) {
            return right.totalPoints - left.totalPoints;
          }
          if (right.winPercentage !== left.winPercentage) {
            return right.winPercentage - left.winPercentage;
          }
          if (right.wins !== left.wins) {
            return right.wins - left.wins;
          }
          if (left.losses !== right.losses) {
            return left.losses - right.losses;
          }
          return left.player.name.localeCompare(right.player.name, "sv");
        });

      return NextResponse.json(sortedStandings);
    } else if (type === "season") {
      const yearParam = searchParams.get("year");
      const year = yearParam ? parseInt(yearParam, 10) : 2026;

      const weeks = await prisma.week.findMany({
        where: { year },
        select: { id: true, weekNumber: true },
        orderBy: { weekNumber: "asc" },
      });

      const weekIds = weeks.map((week) => week.id);
      const players = await prisma.player.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      const weeklyRows = weekIds.length
        ? await prisma.playerStanding.findMany({
            where: { weekId: { in: weekIds } },
            select: {
              playerId: true,
              weekId: true,
              totalPoints: true,
            },
          })
        : [];

      const weeklyPointMap = new Map<string, number>();
      for (const row of weeklyRows) {
        weeklyPointMap.set(`${row.playerId}:${row.weekId}`, row.totalPoints);
      }

      const standings = players
        .map((player) => {
          const weekPoints = weeks.map((week) => weeklyPointMap.get(`${player.id}:${week.id}`) ?? 0);
          const { total, dropped, droppedWeekIndexes } = calculateSeasonTotalWithTwoDropped(weekPoints);

          return {
            playerId: player.id,
            player,
            weekPoints,
            droppedWeekIndexes,
            droppedPoints: dropped,
            totalPoints: total,
          };
        })
        .sort((left, right) => {
          if (right.totalPoints !== left.totalPoints) {
            return right.totalPoints - left.totalPoints;
          }
          return left.player.name.localeCompare(right.player.name, "sv");
        });

      return NextResponse.json({ weeks, standings });
    } else {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dayId, weekId } = await request.json();

    if (!dayId || !weekId) {
      return NextResponse.json(
        { error: "dayId and weekId are required" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await rebuildWeekStandings(tx, weekId);
      const weekRecord = await tx.week.findUnique({ where: { id: weekId }, select: { year: true } });
      await rebuildSeasonStandings(tx, weekRecord?.year ?? 2026);
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json(
      { message: "Rankings calculated successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error calculating standings:", error);
    return NextResponse.json(
      { error: "Failed to calculate standings" },
      { status: 500 }
    );
  }
}
