import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    const player = await prisma.player.create({
      data: {
        name,
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    // When a year is provided, resolve the week IDs for that year
    let weekIdFilter: number[] | null = null;
    if (year) {
      const yearWeeks = await prisma.week.findMany({
        where: { year },
        select: { id: true },
      });
      weekIdFilter = yearWeeks.map((w) => w.id);
    }

    const playerWhere = weekIdFilter !== null
      ? { weekParticipations: { some: { weekId: { in: weekIdFilter } } } }
      : {};

    const [players, standingTotals] = await Promise.all([
      prisma.player.findMany({
        where: playerWhere,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              weekParticipations: weekIdFilter !== null
                ? { where: { weekId: { in: weekIdFilter } } }
                : true,
            },
          },
        },
      }),
      weekIdFilter !== null
        ? prisma.playerStanding.groupBy({
            by: ["playerId"],
            where: weekIdFilter.length ? { weekId: { in: weekIdFilter } } : { weekId: -1 },
            _sum: { gamesPlayed: true, wins: true },
          })
        : prisma.playerStanding.groupBy({
            by: ["playerId"],
            _sum: { gamesPlayed: true, wins: true },
          }),
    ]);

    const totalsMap = new Map(
      standingTotals.map((s) => [s.playerId, { gamesPlayed: s._sum.gamesPlayed ?? 0, wins: s._sum.wins ?? 0 }])
    );

    const mapped = players.map((p) => {
      const totals = totalsMap.get(p.id) ?? { gamesPlayed: 0, wins: 0 };
      const winPercentage = totals.gamesPlayed > 0 ? totals.wins / totals.gamesPlayed : null;
      return { ...p, weeksPlayed: p._count.weekParticipations, gamesPlayed: totals.gamesPlayed, winPercentage };
    });

    mapped.sort((a, b) => {
      if (b.winPercentage === a.winPercentage) return a.name.localeCompare(b.name, "sv");
      if (b.winPercentage === null) return -1;
      if (a.winPercentage === null) return 1;
      return b.winPercentage - a.winPercentage;
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { playerId } = await request.json();

    if (!playerId || Number.isNaN(Number(playerId))) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    const id = Number(playerId);

    await prisma.$transaction(async (tx) => {
      await tx.game.updateMany({ where: { winnerId: id }, data: { winnerId: null } });
      await tx.gameTeam.deleteMany({ where: { playerId: id } });
      await tx.dailyRanking.deleteMany({ where: { playerId: id } });
      await tx.playerStanding.deleteMany({ where: { playerId: id } });
      await tx.seasonStanding.deleteMany({ where: { playerId: id } });
      await tx.weekParticipant.deleteMany({ where: { playerId: id } });
      await tx.player.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}
