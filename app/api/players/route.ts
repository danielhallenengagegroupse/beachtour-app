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

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { weekParticipations: true } },
      },
    });

    return NextResponse.json(
      players.map((p) => ({ ...p, weeksPlayed: p._count.weekParticipations }))
    );
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
