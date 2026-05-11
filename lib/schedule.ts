type GeneratedGame = {
  team1: [number, number];
  team2: [number, number];
};

export type GeneratedRound = {
  roundNumber: number;
  restingPlayerIds: number[];
  games: GeneratedGame[];
};

type Counts = Map<string, number>;

function pairKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function getCount(counts: Counts, a: number, b: number) {
  return counts.get(pairKey(a, b)) ?? 0;
}

function incrementCount(counts: Counts, a: number, b: number) {
  const key = pairKey(a, b);
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function getPairings(group: [number, number, number, number]) {
  const [a, b, c, d] = group;
  return [
    {
      team1: [a, b] as [number, number],
      team2: [c, d] as [number, number],
    },
    {
      team1: [a, c] as [number, number],
      team2: [b, d] as [number, number],
    },
    {
      team1: [a, d] as [number, number],
      team2: [b, c] as [number, number],
    },
  ];
}

function scoreGame(game: GeneratedGame, teammateCounts: Counts, opponentCounts: Counts) {
  const teammatePenalty =
    getCount(teammateCounts, game.team1[0], game.team1[1]) +
    getCount(teammateCounts, game.team2[0], game.team2[1]);

  const opponentPenalty =
    getCount(opponentCounts, game.team1[0], game.team2[0]) +
    getCount(opponentCounts, game.team1[0], game.team2[1]) +
    getCount(opponentCounts, game.team1[1], game.team2[0]) +
    getCount(opponentCounts, game.team1[1], game.team2[1]);

  return teammatePenalty * 10 + opponentPenalty;
}

function chooseBestPairing(group: [number, number, number, number], teammateCounts: Counts, opponentCounts: Counts) {
  return getPairings(group).sort(
    (left, right) => scoreGame(left, teammateCounts, opponentCounts) - scoreGame(right, teammateCounts, opponentCounts)
  )[0];
}

function combinations(values: number[], size: number): number[][] {
  const result: number[][] = [];

  function walk(start: number, acc: number[]) {
    if (acc.length === size) {
      result.push([...acc]);
      return;
    }

    for (let index = start; index <= values.length - (size - acc.length); index++) {
      acc.push(values[index]);
      walk(index + 1, acc);
      acc.pop();
    }
  }

  walk(0, []);
  return result;
}

function chooseBestGroup(available: number[], teammateCounts: Counts, opponentCounts: Counts) {
  const allGroups = combinations(available, 4);

  return allGroups.sort((left, right) => {
    const leftPairing = chooseBestPairing(left as [number, number, number, number], teammateCounts, opponentCounts);
    const rightPairing = chooseBestPairing(right as [number, number, number, number], teammateCounts, opponentCounts);

    return scoreGame(leftPairing, teammateCounts, opponentCounts) - scoreGame(rightPairing, teammateCounts, opponentCounts);
  })[0] as [number, number, number, number];
}

function scoreRestGroup(
  playerIds: number[],
  group: number[],
  restSlots: number,
  restCounts: Map<number, number>,
  lastRestRound: Map<number, number>,
  restPairCounts: Counts
) {
  const projectedRestCounts = new Map(restCounts);
  for (const playerId of group) {
    projectedRestCounts.set(playerId, (projectedRestCounts.get(playerId) ?? 0) + 1);
  }

  const projectedCounts = playerIds.map((playerId) => projectedRestCounts.get(playerId) ?? 0);
  const projectedSpread = Math.max(...projectedCounts) - Math.min(...projectedCounts);
  const repeatedRestPenalty = combinations(group, 2).reduce(
    (sum, [left, right]) => sum + getCount(restPairCounts, left, right),
    0
  );
  const minimumProjectedRestCount = Math.min(...projectedCounts);
  const nextRestCandidates = playerIds.filter(
    (playerId) => (projectedRestCounts.get(playerId) ?? 0) === minimumProjectedRestCount
  );
  const futureRepeatPenalty =
    nextRestCandidates.length >= restSlots
      ? combinations(nextRestCandidates, restSlots)
          .map((candidateGroup) =>
            combinations(candidateGroup, 2).reduce(
              (sum, [left, right]) => sum + getCount(restPairCounts, left, right),
              0
            )
          )
          .sort((left, right) => left - right)[0] ?? 0
      : 0;
  const recentRestPenalty = group.reduce((sum, playerId) => sum + (lastRestRound.get(playerId) ?? -1), 0);

  return projectedSpread * 1000 + repeatedRestPenalty * 100 + futureRepeatPenalty * 10 + recentRestPenalty;
}

function chooseRestingPlayers(
  playerIds: number[],
  restSlots: number,
  restCounts: Map<number, number>,
  lastRestRound: Map<number, number>,
  restPairCounts: Counts
) {
  if (restSlots === 0) {
    return [];
  }

  return combinations(playerIds, restSlots)
    .sort((left, right) => {
      const scoreDiff =
        scoreRestGroup(playerIds, left, restSlots, restCounts, lastRestRound, restPairCounts) -
        scoreRestGroup(playerIds, right, restSlots, restCounts, lastRestRound, restPairCounts);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) {
          return left[index] - right[index];
        }
      }

      return 0;
    })[0];
}

function applyGameHistory(game: GeneratedGame, teammateCounts: Counts, opponentCounts: Counts) {
  incrementCount(teammateCounts, game.team1[0], game.team1[1]);
  incrementCount(teammateCounts, game.team2[0], game.team2[1]);

  incrementCount(opponentCounts, game.team1[0], game.team2[0]);
  incrementCount(opponentCounts, game.team1[0], game.team2[1]);
  incrementCount(opponentCounts, game.team1[1], game.team2[0]);
  incrementCount(opponentCounts, game.team1[1], game.team2[1]);
}

export function generateSchedule(playerIds: number[], rounds: number): GeneratedRound[] {
  if (playerIds.length < 4) {
    throw new Error("At least 4 players are required to generate games.");
  }

  if (rounds < 1) {
    throw new Error("At least 1 round is required.");
  }

  const teammateCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const restCounts = new Map<number, number>();
  const restPairCounts = new Map<string, number>();
  const lastRestRound = new Map<number, number>();
  const restSlots = playerIds.length % 4;
  const schedule: GeneratedRound[] = [];

  for (const playerId of playerIds) {
    restCounts.set(playerId, 0);
  }

  for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
    const restingPlayerIds = chooseRestingPlayers(playerIds, restSlots, restCounts, lastRestRound, restPairCounts);
    const restingPlayers = new Set(restingPlayerIds);
    const available = playerIds.filter((playerId) => !restingPlayers.has(playerId));
    const games: GeneratedGame[] = [];

    for (const playerId of restingPlayerIds) {
      restCounts.set(playerId, (restCounts.get(playerId) ?? 0) + 1);
      lastRestRound.set(playerId, roundNumber);
    }

    for (const [left, right] of combinations(restingPlayerIds, 2)) {
      incrementCount(restPairCounts, left, right);
    }

    while (available.length >= 4) {
      const group = chooseBestGroup(available, teammateCounts, opponentCounts);
      const game = chooseBestPairing(group, teammateCounts, opponentCounts);
      games.push(game);
      applyGameHistory(game, teammateCounts, opponentCounts);

      for (const playerId of group) {
        const index = available.indexOf(playerId);
        if (index >= 0) {
          available.splice(index, 1);
        }
      }
    }

    schedule.push({
      roundNumber,
      restingPlayerIds,
      games,
    });
  }

  return schedule;
}