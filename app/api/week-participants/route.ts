import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const weekId = request.nextUrl.searchParams.get("weekId");

    if (!weekId) {
      return NextResponse.json({ error: "weekId is required" }, { status: 400 });
    }

    const participants = await prisma.weekParticipant.findMany({
      where: { weekId: parseInt(weekId) },
      include: { player: true },
      orderBy: { player: { name: "asc" } },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching week participants:", error);
    return NextResponse.json({ error: "Failed to fetch week participants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { weekId, playerId } = await request.json();

    if (!weekId || !playerId) {
      return NextResponse.json({ error: "weekId and playerId are required" }, { status: 400 });
    }

    const participant = await prisma.weekParticipant.create({
      data: { weekId, playerId },
      include: { player: true },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error("Error creating week participant:", error);
    return NextResponse.json({ error: "Failed to add player to week" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { weekId, playerId } = await request.json();

    if (!weekId || !playerId) {
      return NextResponse.json({ error: "weekId and playerId are required" }, { status: 400 });
    }

    await prisma.weekParticipant.delete({
      where: {
        weekId_playerId: {
          weekId,
          playerId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing week participant:", error);
    return NextResponse.json({ error: "Failed to remove player from week" }, { status: 500 });
  }
}