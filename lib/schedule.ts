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
  const pairings = getPairings(group);

  let bestPairing = pairings[0];
  let bestScore = scoreGame(bestPairing, teammateCounts, opponentCounts);

  for (let index = 1; index < pairings.length; index++) {
    const candidate = pairings[index];
    const candidateScore = scoreGame(candidate, teammateCounts, opponentCounts);

    if (candidateScore < bestScore || (candidateScore === bestScore && Math.random() < 0.5)) {
      bestPairing = candidate;
      bestScore = candidateScore;
    }
  }

  return bestPairing;
}

function totalGroupInteraction(group: [number, number, number, number], teammateCounts: Counts, opponentCounts: Counts): number {
  const [a, b, c, d] = group;
  const pairs: [number, number][] = [[a, b], [a, c], [a, d], [b, c], [b, d], [c, d]];
  return pairs.reduce((sum, [x, y]) => sum + getCount(teammateCounts, x, y) + getCount(opponentCounts, x, y), 0);
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

  let bestGroup = allGroups[0] as [number, number, number, number];
  let bestPairing = chooseBestPairing(bestGroup, teammateCounts, opponentCounts);
  let bestScore = scoreGame(bestPairing, teammateCounts, opponentCounts);

  for (let index = 1; index < allGroups.length; index++) {
    const candidateGroup = allGroups[index] as [number, number, number, number];
    const candidatePairing = chooseBestPairing(candidateGroup, teammateCounts, opponentCounts);
    const candidateScore = scoreGame(candidatePairing, teammateCounts, opponentCounts);

    if (candidateScore < bestScore) {
      bestGroup = candidateGroup;
      bestPairing = candidatePairing;
      bestScore = candidateScore;
      continue;
    }

    if (candidateScore === bestScore) {
      const candidateInteraction = totalGroupInteraction(candidateGroup, teammateCounts, opponentCounts);
      const bestInteraction = totalGroupInteraction(bestGroup, teammateCounts, opponentCounts);

      if (candidateInteraction < bestInteraction || (candidateInteraction === bestInteraction && Math.random() < 0.5)) {
        bestGroup = candidateGroup;
        bestPairing = candidatePairing;
      }
    }
  }

  return bestGroup;
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

  if (restSlots <= 6) {
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

  const selected: number[] = [];
  const remaining = [...playerIds];

  while (selected.length < restSlots && remaining.length > 0) {
    let bestPlayerId = remaining[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidatePlayerId of remaining) {
      const candidateRestCount = (restCounts.get(candidatePlayerId) ?? 0) + 1;
      const candidateLastRestRound = lastRestRound.get(candidatePlayerId) ?? -1;
      const candidatePairPenalty = selected.reduce(
        (sum, selectedPlayerId) => sum + getCount(restPairCounts, candidatePlayerId, selectedPlayerId),
        0
      );
      const candidateScore = candidateRestCount * 1000 + candidatePairPenalty * 100 + candidateLastRestRound;

      if (candidateScore < bestScore || (candidateScore === bestScore && candidatePlayerId < bestPlayerId)) {
        bestPlayerId = candidatePlayerId;
        bestScore = candidateScore;
      }
    }

    selected.push(bestPlayerId);
    const index = remaining.indexOf(bestPlayerId);
    if (index >= 0) {
      remaining.splice(index, 1);
    }
  }

  return selected.sort((left, right) => left - right);
}

function permutations(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr.slice()];
  const result: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function scoreCourtAssignment(games: GeneratedGame[], perm: number[], courtCounts: Map<number, number[]>): number {
  let score = 0;
  for (let courtIndex = 0; courtIndex < perm.length; courtIndex++) {
    const game = games[perm[courtIndex]];
    for (const playerId of [game.team1[0], game.team1[1], game.team2[0], game.team2[1]]) {
      const counts = courtCounts.get(playerId);
      score += counts?.[courtIndex] ?? 0;
    }
  }
  return score;
}

function assignCourts(games: GeneratedGame[], courtCounts: Map<number, number[]>): GeneratedGame[] {
  if (games.length <= 1) return games;
  const indices = Array.from({ length: games.length }, (_, i) => i);
  const perms = permutations(indices);

  let bestPerm = perms[0];
  let bestScore = scoreCourtAssignment(games, perms[0], courtCounts);

  for (let i = 1; i < perms.length; i++) {
    const score = scoreCourtAssignment(games, perms[i], courtCounts);
    if (score < bestScore || (score === bestScore && Math.random() < 0.5)) {
      bestScore = score;
      bestPerm = perms[i];
    }
  }

  return bestPerm.map((gameIndex) => games[gameIndex]);
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
  const courtCounts = new Map<number, number[]>();
  const restSlots = playerIds.length > 16 ? playerIds.length - 16 : playerIds.length % 4;
  const schedule: GeneratedRound[] = [];

  for (const playerId of playerIds) {
    restCounts.set(playerId, 0);
    courtCounts.set(playerId, []);
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

    const assignedGames = assignCourts(games, courtCounts);

    for (let courtIndex = 0; courtIndex < assignedGames.length; courtIndex++) {
      const game = assignedGames[courtIndex];
      for (const playerId of [game.team1[0], game.team1[1], game.team2[0], game.team2[1]]) {
        const counts = courtCounts.get(playerId)!;
        while (counts.length <= courtIndex) counts.push(0);
        counts[courtIndex]++;
      }
    }

    schedule.push({
      roundNumber,
      restingPlayerIds,
      games: assignedGames,
    });
  }

  return schedule;
}