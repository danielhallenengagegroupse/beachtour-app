import { Prisma, PrismaClient } from "@prisma/client";

export const DEFAULT_POINT_RULES = [10, 8, 6, 5, 4, 3, 2, 1].map((points, index) => ({
  position: index + 1,
  points,
}));

type PrismaTransaction = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

type GameWithTeams = Prisma.GameGetPayload<{
  include: { teams: true };
}>;

type PlayerStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
};

function calculateWinPercentage(stats: PlayerStats) {
  if (stats.gamesPlayed === 0) {
    return 0;
  }

  return stats.wins / stats.gamesPlayed;
}

function createStats(): PlayerStats {
  return { gamesPlayed: 0, wins: 0, losses: 0 };
}

function touchPlayer(stats: Map<number, PlayerStats>, playerId: number) {
  const entry = stats.get(playerId) ?? createStats();
  stats.set(playerId, entry);
  return entry;
}

function sortStats(left: [number, PlayerStats], right: [number, PlayerStats]) {
  const leftWinPercentage = calculateWinPercentage(left[1]);
  const rightWinPercentage = calculateWinPercentage(right[1]);

  if (rightWinPercentage !== leftWinPercentage) {
    return rightWinPercentage - leftWinPercentage;
  }

  if (right[1].wins !== left[1].wins) {
    return right[1].wins - left[1].wins;
  }

  if (left[1].losses !== right[1].losses) {
    return left[1].losses - right[1].losses;
  }

  if (right[1].gamesPlayed !== left[1].gamesPlayed) {
    return right[1].gamesPlayed - left[1].gamesPlayed;
  }

  return left[0] - right[0];
}

function buildPlayerStats(games: GameWithTeams[]) {
  const stats = new Map<number, PlayerStats>();

  for (const game of games) {
    const team1Players = game.teams.filter((team) => team.team === 1).map((team) => team.playerId);
    const team2Players = game.teams.filter((team) => team.team === 2).map((team) => team.playerId);
    const allPlayers = [...team1Players, ...team2Players];

    for (const playerId of allPlayers) {
      touchPlayer(stats, playerId).gamesPlayed += 1;
    }

    const team1Score = game.team1Score ?? 0;
    const team2Score = game.team2Score ?? 0;

    if (team1Score === team2Score) {
      for (const playerId of allPlayers) {
        const entry = touchPlayer(stats, playerId);
        entry.wins += 0.5;
        entry.losses += 0.5;
      }
      continue;
    }

    const winners = team1Score > team2Score ? team1Players : team2Players;
    const losers = team1Score > team2Score ? team2Players : team1Players;

    for (const playerId of winners) {
      touchPlayer(stats, playerId).wins += 1;
    }

    for (const playerId of losers) {
      touchPlayer(stats, playerId).losses += 1;
    }
  }

  return [...stats.entries()].sort(sortStats);
}

function buildCompetitionRanks(sortedPlayers: Array<[number, PlayerStats]>) {
  let currentRank = 0;
  let previousWinPercentage: number | null = null;

  return sortedPlayers.map(([playerId, stats], index) => {
    const winPercentage = calculateWinPercentage(stats);

    if (previousWinPercentage === null || winPercentage !== previousWinPercentage) {
      currentRank = index + 1;
      previousWinPercentage = winPercentage;
    }

    return {
      playerId,
      stats,
      rank: currentRank,
    };
  });
}

export async function ensureDefaultPointRules(tx: PrismaTransaction) {
  const count = await tx.rankingPointRule.count();

  if (count > 0) {
    return;
  }

  await tx.rankingPointRule.createMany({
    data: DEFAULT_POINT_RULES,
  });
}

export async function getPointRuleMap(tx: PrismaTransaction) {
  await ensureDefaultPointRules(tx);

  const rules = await tx.rankingPointRule.findMany({
    orderBy: { position: "asc" },
  });

  return new Map(rules.map((rule) => [rule.position, rule.points]));
}

export async function rebuildWeekStandings(tx: PrismaTransaction, weekId: number) {
  const pointRuleMap = await getPointRuleMap(tx);
  const week = await tx.week.findUnique({
    where: { id: weekId },
    select: { rainyDay: true },
  });
  const rainyMultiplier = week?.rainyDay ? 2 : 1;
  const weekDays = await tx.day.findMany({
    where: { weekId },
    select: { id: true },
    orderBy: { dayNumber: "asc" },
  });

  const weekDayIds = weekDays.map((day) => day.id);

  await tx.dailyRanking.deleteMany({ where: { dayId: { in: weekDayIds } } });
  await tx.playerStanding.deleteMany({ where: { weekId } });

  for (const dayId of weekDayIds) {
    const games = await tx.game.findMany({
      where: {
        dayId,
        team1Score: { not: null },
        team2Score: { not: null },
      },
      include: { teams: true },
      orderBy: [{ roundNumber: "asc" }, { gameNumber: "asc" }],
    });

    const rankedPlayers = buildCompetitionRanks(buildPlayerStats(games));

    for (const entry of rankedPlayers) {
      await tx.dailyRanking.create({
        data: {
          dayId,
          playerId: entry.playerId,
          rank: entry.rank,
          points: (pointRuleMap.get(entry.rank) ?? 0) * rainyMultiplier,
          winsCount: entry.stats.wins,
          lossesCount: entry.stats.losses,
        },
      });
    }
  }

  const weekGames = await tx.game.findMany({
    where: {
      dayId: { in: weekDayIds },
      team1Score: { not: null },
      team2Score: { not: null },
    },
    include: { teams: true },
  });
  const weeklyStats = new Map<number, { gamesPlayed: number; wins: number; losses: number; totalPoints: number }>();

  for (const [playerId, stats] of buildPlayerStats(weekGames)) {
    weeklyStats.set(playerId, {
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      losses: stats.losses,
      totalPoints: 0,
    });
  }

  const weekRankings = await tx.dailyRanking.findMany({
    where: { dayId: { in: weekDayIds } },
  });

  for (const ranking of weekRankings) {
    const entry = weeklyStats.get(ranking.playerId) ?? {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalPoints: 0,
    };
    entry.totalPoints += ranking.points;
    weeklyStats.set(ranking.playerId, entry);
  }

  for (const [playerId, stats] of [...weeklyStats.entries()].sort((left, right) => {
    if (right[1].totalPoints !== left[1].totalPoints) {
      return right[1].totalPoints - left[1].totalPoints;
    }
    const leftWinPercentage = left[1].gamesPlayed === 0 ? 0 : left[1].wins / left[1].gamesPlayed;
    const rightWinPercentage = right[1].gamesPlayed === 0 ? 0 : right[1].wins / right[1].gamesPlayed;
    if (rightWinPercentage !== leftWinPercentage) {
      return rightWinPercentage - leftWinPercentage;
    }
    if (right[1].wins !== left[1].wins) {
      return right[1].wins - left[1].wins;
    }
    if (left[1].losses !== right[1].losses) {
      return left[1].losses - right[1].losses;
    }
    return left[0] - right[0];
  })) {
    await tx.playerStanding.create({
      data: {
        weekId,
        playerId,
        totalPoints: stats.totalPoints,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
      },
    });
  }
}

export async function rebuildSeasonStandings(tx: PrismaTransaction) {
  const allWeeklyStandings = await tx.playerStanding.findMany();
  const seasonStats = new Map<number, { gamesPlayed: number; wins: number; losses: number; totalPoints: number }>();

  for (const standing of allWeeklyStandings) {
    const entry = seasonStats.get(standing.playerId) ?? {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalPoints: 0,
    };
    entry.gamesPlayed += standing.gamesPlayed;
    entry.wins += standing.wins;
    entry.losses += standing.losses;
    entry.totalPoints += standing.totalPoints;
    seasonStats.set(standing.playerId, entry);
  }

  await tx.seasonStanding.deleteMany();

  for (const [playerId, stats] of [...seasonStats.entries()].sort((left, right) => {
    if (right[1].totalPoints !== left[1].totalPoints) {
      return right[1].totalPoints - left[1].totalPoints;
    }
    const leftWinPercentage = left[1].gamesPlayed === 0 ? 0 : left[1].wins / left[1].gamesPlayed;
    const rightWinPercentage = right[1].gamesPlayed === 0 ? 0 : right[1].wins / right[1].gamesPlayed;
    if (rightWinPercentage !== leftWinPercentage) {
      return rightWinPercentage - leftWinPercentage;
    }
    if (right[1].wins !== left[1].wins) {
      return right[1].wins - left[1].wins;
    }
    if (left[1].losses !== right[1].losses) {
      return left[1].losses - right[1].losses;
    }
    return left[0] - right[0];
  })) {
    await tx.seasonStanding.create({
      data: {
        playerId,
        totalPoints: stats.totalPoints,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
      },
    });
  }
}

export async function rebuildAllStandings(tx: PrismaTransaction) {
  const weeks = await tx.week.findMany({
    select: { id: true },
    orderBy: { weekNumber: "asc" },
  });

  for (const week of weeks) {
    await rebuildWeekStandings(tx, week.id);
  }

  await rebuildSeasonStandings(tx);
}