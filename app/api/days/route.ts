import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { weekId, dayNumber, date } = await request.json();

    if (!weekId || !dayNumber || !date) {
      return NextResponse.json(
        { error: "weekId, dayNumber, and date are required" },
        { status: 400 }
      );
    }

    const day = await prisma.day.create({
      data: {
        weekId,
        dayNumber,
        date: new Date(date),
      },
    });

    return NextResponse.json(day, { status: 201 });
  } catch (error) {
    console.error("Error creating day:", error);
    return NextResponse.json(
      { error: "Failed to create day" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekId = searchParams.get("weekId");

    if (!weekId) {
      return NextResponse.json(
        { error: "weekId is required" },
        { status: 400 }
      );
    }

    const days = await prisma.day.findMany({
      where: { weekId: parseInt(weekId) },
      orderBy: { dayNumber: "asc" },
      include: {
        games: { orderBy: { gameNumber: "asc" } },
      },
    });

    return NextResponse.json(days);
  } catch (error) {
    console.error("Error fetching days:", error);
    return NextResponse.json(
      { error: "Failed to fetch days" },
      { status: 500 }
    );
  }
}
