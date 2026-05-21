import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebuildSeasonStandings, rebuildWeekStandings } from "@/lib/standings";

async function ensureWeekCompleteColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "weeks"
    ADD COLUMN IF NOT EXISTS "weekComplete" BOOLEAN NOT NULL DEFAULT false
  `);
}

export async function POST(request: NextRequest) {
  try {
    await ensureWeekCompleteColumn();

    const { weekNumber, date } = await request.json();

    if (!weekNumber || !date) {
      return NextResponse.json(
        { error: "Week number and date are required" },
        { status: 400 }
      );
    }

    const weekDate = new Date(date);

    const week = await prisma.week.create({
      data: {
        weekNumber,
        startDate: weekDate,
        endDate: weekDate,
        rainyDay: false,
        weekComplete: false,
        days: {
          create: {
            dayNumber: 1,
            date: weekDate,
          },
        },
      },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        participants: {
          include: { player: true },
          orderBy: { player: { name: "asc" } },
        },
      },
    });

    return NextResponse.json(week, { status: 201 });
  } catch (error) {
    console.error("Error creating week:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Veckan finns redan" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create week" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureWeekCompleteColumn();

    const includeActivity = request.nextUrl.searchParams.get("activity") === "1";

    const weeks = await prisma.week.findMany({
      orderBy: { weekNumber: "asc" },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        participants: {
          include: { player: true },
          orderBy: { player: { name: "asc" } },
        },
      },
    });

    if (!includeActivity || weeks.length === 0) {
      return NextResponse.json(weeks);
    }

    const weekIds = weeks.map((week) => week.id);

    const [dayGameCounts, standingsCounts] = await Promise.all([
      prisma.day.findMany({
        where: { weekId: { in: weekIds } },
        select: {
          weekId: true,
          _count: { select: { games: true } },
        },
      }),
      prisma.playerStanding.groupBy({
        by: ["weekId"],
        where: { weekId: { in: weekIds } },
        _count: { _all: true },
      }),
    ]);

    const gamesByWeek = new Map<number, number>();
    for (const row of dayGameCounts) {
      gamesByWeek.set(row.weekId, (gamesByWeek.get(row.weekId) ?? 0) + row._count.games);
    }

    const standingsByWeek = new Map<number, number>();
    for (const row of standingsCounts) {
      standingsByWeek.set(row.weekId, row._count._all);
    }

    const weeksWithActivity = weeks.map((week) => ({
      ...week,
      hasMatches: (gamesByWeek.get(week.id) ?? 0) > 0,
      hasWeeklyStandings: (standingsByWeek.get(week.id) ?? 0) > 0,
    }));

    return NextResponse.json(weeksWithActivity);
  } catch (error) {
    console.error("Error fetching weeks:", error);
    return NextResponse.json(
      { error: "Failed to fetch weeks" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureWeekCompleteColumn();

    const { weekId, rainyDay, weekComplete } = await request.json();

    if (!weekId || (rainyDay === undefined && weekComplete === undefined)) {
      return NextResponse.json(
        { error: "weekId and at least one field to update are required" },
        { status: 400 }
      );
    }

    const updateData: { rainyDay?: boolean; weekComplete?: boolean } = {};

    if (rainyDay !== undefined) {
      updateData.rainyDay = Boolean(rainyDay);
    }

    if (weekComplete !== undefined) {
      updateData.weekComplete = Boolean(weekComplete);
    }

    const shouldRebuildStandings = rainyDay !== undefined;

    const updatedWeek = await prisma.$transaction(async (tx) => {
      const week = await tx.week.update({
        where: { id: Number(weekId) },
        data: updateData,
        include: {
          days: { orderBy: { dayNumber: "asc" } },
          participants: {
            include: { player: true },
            orderBy: { player: { name: "asc" } },
          },
        },
      });

      if (shouldRebuildStandings) {
        await rebuildWeekStandings(tx, week.id);
        await rebuildSeasonStandings(tx);
      }

      return week;
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json(updatedWeek);
  } catch (error) {
    console.error("Error updating week:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update week: ${detail}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureWeekCompleteColumn();

    const weekId = request.nextUrl.searchParams.get("weekId");

    if (!weekId) {
      return NextResponse.json({ error: "weekId is required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.week.delete({
        where: { id: parseInt(weekId) },
      });

      await rebuildSeasonStandings(tx);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting week:", error);
    return NextResponse.json(
      { error: "Failed to delete week" },
      { status: 500 }
    );
  }
}
