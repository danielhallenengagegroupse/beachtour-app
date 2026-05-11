import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebuildSeasonStandings, rebuildWeekStandings } from "@/lib/standings";

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: "Failed to create week" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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

    return NextResponse.json(weeks);
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
    const { weekId, rainyDay } = await request.json();

    if (!weekId || rainyDay === undefined) {
      return NextResponse.json(
        { error: "weekId and rainyDay are required" },
        { status: 400 }
      );
    }

    const updatedWeek = await prisma.$transaction(async (tx) => {
      const week = await tx.week.update({
        where: { id: Number(weekId) },
        data: { rainyDay: Boolean(rainyDay) },
        include: {
          days: { orderBy: { dayNumber: "asc" } },
          participants: {
            include: { player: true },
            orderBy: { player: { name: "asc" } },
          },
        },
      });

      await rebuildWeekStandings(tx, week.id);
      await rebuildSeasonStandings(tx);

      return week;
    });

    return NextResponse.json(updatedWeek);
  } catch (error) {
    console.error("Error updating week:", error);
    return NextResponse.json(
      { error: "Failed to update week" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
