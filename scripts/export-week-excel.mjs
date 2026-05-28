/**
 * Export week standings and match results to Excel.
 * Usage: node scripts/export-week-excel.mjs [weekNumber]
 * Default weekNumber: 21
 */

import * as XLSX from "xlsx";

const BASE_URL = "https://beachtour.vkbjarke.se";
const targetWeekNumber = Number(process.argv[2] ?? 21);

async function main() {
  // 1. Find the week
  const weeksRes = await fetch(`${BASE_URL}/api/weeks`);
  const weeks = await weeksRes.json();
  const week = weeks.find((w) => w.weekNumber === targetWeekNumber);
  if (!week) {
    console.error(`Vecka ${targetWeekNumber} hittades inte.`);
    process.exit(1);
  }
  console.log(`Hittade vecka ${week.weekNumber} (id=${week.id}, datum=${new Date(week.startDate).toLocaleDateString("sv-SE")})`);

  // 2. Fetch standings
  const standRes = await fetch(`${BASE_URL}/api/standings?type=weekly&weekId=${week.id}`);
  const standings = await standRes.json();

  // 3. Fetch games
  const gamesRes = await fetch(`${BASE_URL}/api/games?weekId=${week.id}`);
  const games = await gamesRes.json();

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Ställning ---
  const standRows = [
    ["Position", "Spelare", "Matcher", "Vinster", "Förluster", "Vinst %", "Poäng"],
  ];
  standings.forEach((s, i) => {
    const rank =
      i === 0 || s.totalPoints !== standings[i - 1].totalPoints
        ? i + 1
        : standings.slice(0, i).findIndex((x) => x.totalPoints === s.totalPoints) + 1;
    standRows.push([
      rank,
      s.player.name,
      s.gamesPlayed,
      s.wins,
      s.losses,
      `${(s.winPercentage * 100).toFixed(1)} %`,
      s.totalPoints,
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(standRows);
  ws1["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Ställning");

  // --- Sheet 2: Matcher ---
  // Compute court (Bana) number = position within each round
  const roundCourtCounters = new Map();
  const gameBana = new Map();
  for (const g of games) {
    const prev = roundCourtCounters.get(g.roundNumber) ?? 0;
    const bana = prev + 1;
    roundCourtCounters.set(g.roundNumber, bana);
    gameBana.set(g.id, bana);
  }

  const gameRows = [
    ["Runda", "Bana", "Lag 1 Spelare A", "Lag 1 Spelare B", "Set Lag 1", "Set Lag 2", "Lag 2 Spelare A", "Lag 2 Spelare B", "Vinnare"],
  ];
  games.forEach((g) => {
    const team1 = g.teams.filter((t) => t.team === 1);
    const team2 = g.teams.filter((t) => t.team === 2);
    const t1names = team1.map((t) => t.player.name);
    const t2names = team2.map((t) => t.player.name);
    let winner = "";
    if (g.team1Score != null && g.team2Score != null) {
      winner = g.team1Score > g.team2Score ? t1names.join(" & ") : t2names.join(" & ");
    }
    gameRows.push([
      g.roundNumber,
      gameBana.get(g.id),
      t1names[0] ?? "",
      t1names[1] ?? "",
      g.team1Score ?? "",
      g.team2Score ?? "",
      t2names[0] ?? "",
      t2names[1] ?? "",
      winner,
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(gameRows);
  ws2["!cols"] = [
    { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 20 },
    { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Matcher");

  const filename = `vecka${targetWeekNumber}_resultat.xlsx`;
  XLSX.writeFile(wb, filename);
  console.log(`Exporterad till ${filename}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
