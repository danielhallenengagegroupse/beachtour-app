import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_POINT_RULES, ensureDefaultPointRules, rebuildAllStandings } from "@/lib/standings";

export async function GET() {
  try {
    await prisma.$transaction(async (tx) => {
      await ensureDefaultPointRules(tx);
    });

    const rules = await prisma.rankingPointRule.findMany({
      orderBy: { position: "asc" },
    });

    return NextResponse.json(rules.length > 0 ? rules : DEFAULT_POINT_RULES);
  } catch (error) {
    console.error("Error fetching ranking points:", error);
    return NextResponse.json({ error: "Failed to fetch ranking points" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { rules } = await request.json();

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: "rules are required" }, { status: 400 });
    }

    const normalizedRules = rules
      .map((rule) => ({
        position: Number(rule.position),
        points: Number(rule.points),
      }))
      .filter((rule) => Number.isInteger(rule.position) && rule.position > 0 && Number.isFinite(rule.points));

    if (normalizedRules.length !== rules.length) {
      return NextResponse.json({ error: "All rules must have a valid position and points value" }, { status: 400 });
    }

    const uniquePositions = new Set(normalizedRules.map((rule) => rule.position));
    if (uniquePositions.size !== normalizedRules.length) {
      return NextResponse.json({ error: "Each position can only appear once" }, { status: 400 });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.rankingPointRule.deleteMany();
        await tx.rankingPointRule.createMany({
          data: normalizedRules.sort((left, right) => left.position - right.position),
        });
        await rebuildAllStandings(tx);
      },
      {
        // Rebuilding standings can touch many rows and exceed Prisma's default 5s interactive transaction timeout.
        maxWait: 10_000,
        timeout: 60_000,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating ranking points:", error);
    return NextResponse.json({ error: "Failed to update ranking points" }, { status: 500 });
  }
}