import { NextRequest, NextResponse } from "next/server";

const VKBJARKE_HOST = "www.vkbjarke.se";

function isAllowedCalendarUrl(urlText: string) {
  try {
    const parsed = new URL(urlText);
    return parsed.hostname === VKBJARKE_HOST && parsed.pathname.includes("/aktivitet/");
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Extracts participant names from the "Kommer" (attending) section of a
 * vkbjarke.se activity page.
 *
 * Structure: table rows inside #tabYes contain cells where the first generic
 * child holds the plain name text. The role label "| Ledare" follows as a
 * separate text node and is stripped.
 */
function extractAttendeesFromHtml(html: string): string[] {
  // Find the #tabYes section and grab only that block
  const tabYesMatch = html.match(/id=["']tabYes["'][^>]*>([\s\S]*?)(?:id=["']tabNo["']|id=["']tabNoAnswer["']|<\/div>[\s\S]{0,50}<div[^>]+id=["']tab)/i);
  const searchHtml = tabYesMatch ? tabYesMatch[1] : html;

  // Extract <td> cell content from table rows – first generic element holds the name
  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const names: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = tdPattern.exec(searchHtml)) !== null) {
    // Strip all tags, decode entities, normalise whitespace
    const raw = match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\|\s*Ledare/gi, "")
      .replace(/\|\s*Admin/gi, "");
    const name = normalizeWhitespace(decodeHtmlEntities(raw));

    // Must look like "Firstname Lastname" (2-4 words, letters only incl Swedish)
    if (!name || name.length < 3 || name.length > 60 || /\d/.test(name)) {
      continue;
    }
    const parts = name.split(" ");
    if (parts.length < 2 || parts.length > 4) {
      continue;
    }
    const namePartPattern = /^[\p{L}][\p{L}'\-]*$/u;
    if (parts.every((part) => namePartPattern.test(part))) {
      names.push(name);
    }
  }

  return [...new Set(names)];
}

async function fetchWithSession(activityUrl: string): Promise<string> {
  const username = process.env.VKBJARKE_USERNAME;
  const password = process.env.VKBJARKE_PASSWORD;
  const loginUrl = process.env.VKBJARKE_LOGIN_URL ?? "https://www.vkbjarke.se/vkbjarke-beachvolleysenior2026/logga-in";

  if (!username || !password) {
    throw new Error("Inloggningsuppgifter saknas i miljövariablerna.");
  }

  // Step 1: GET login page to capture session cookie
  const loginPageRes = await fetch(loginUrl, {
    headers: { "User-Agent": "BeachTour/1.0" },
    redirect: "follow",
  });

  const rawCookies = loginPageRes.headers.getSetCookie?.() ?? [];
  const sessionCookies = rawCookies.map((c) => c.split(";")[0]).join("; ");

  // Step 2: POST credentials
  const formBody = new URLSearchParams({
    UserName: username,
    UserPass: password,
    cbautologin: "false",
  });

  const loginRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "User-Agent": "BeachTour/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: sessionCookies,
      Referer: loginUrl,
    },
    body: formBody.toString(),
    redirect: "follow",
  });

  // Collect cookies from login response too
  const loginCookies = loginRes.headers.getSetCookie?.() ?? [];
  const allCookies = [...new Set([
    ...sessionCookies.split("; "),
    ...loginCookies.map((c) => c.split(";")[0]),
  ])].join("; ");

  // Step 3: GET the activity page with the authenticated session
  const activityRes = await fetch(activityUrl, {
    headers: {
      "User-Agent": "BeachTour/1.0",
      Cookie: allCookies,
      Referer: loginUrl,
    },
    redirect: "follow",
  });

  if (!activityRes.ok) {
    throw new Error(`HTTP ${activityRes.status} från aktivitetssidan.`);
  }

  return activityRes.text();
}

const SV_MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

const CALENDAR_BASE = "https://www.vkbjarke.se/vkbjarke-beachvolleysenior2026";

async function discoverActivityUrl(weekDate: Date): Promise<string> {
  const year = weekDate.getUTCFullYear();
  const month = weekDate.getUTCMonth();
  const day = weekDate.getUTCDate();

  const calendarUrl = `${CALENDAR_BASE}/kalender/${year}/${SV_MONTHS[month]}`;
  const res = await fetch(calendarUrl, { headers: { "User-Agent": "BeachTour/1.0" } });

  if (!res.ok) {
    throw new Error(`Kunde inte hämta kalendern (HTTP ${res.status}).`);
  }

  const html = await res.text();

  // Find where this day appears as a calendar date cell: >19< or >19 Tis<
  const dayStartRe = new RegExp(
    `>\\s*0?${day}(?:\\s+(?:M\u00e5n|Tis|Ons|Tor|Fre|L\u00f6r|S\u00f6n))?\\s*<`,
    "i"
  );
  const dayStartMatch = dayStartRe.exec(html);

  if (!dayStartMatch) {
    throw new Error(
      `Dag ${day} ${SV_MONTHS[month]} hittades inte i kalendern.`
    );
  }

  // Bound the search region: from this day's marker up to the next day's marker
  const nextDay = day + 1;
  const searchRegion = html.slice(dayStartMatch.index, dayStartMatch.index + 800);
  const nextDayRe = new RegExp(
    `>\\s*0?${nextDay}(?:\\s+(?:M\u00e5n|Tis|Ons|Tor|Fre|L\u00f6r|S\u00f6n))?\\s*<`,
    "i"
  );
  const nextDayMatch = nextDayRe.exec(searchRegion);
  // Limit to current day's section; if last day of month, cap at 400 chars
  const daySection = nextDayMatch
    ? searchRegion.slice(0, nextDayMatch.index)
    : searchRegion.slice(0, 400);

  if (!/beach[\s-]*tour|summer[\s-]*beach/i.test(daySection)) {
    throw new Error(
      `Inget Beach Tour-evenemang hittades den ${day} ${SV_MONTHS[month]} ${year} i kalendern.`
    );
  }

  const linkMatch = /href="([^"]*\/aktivitet\/[^"]+)"/i.exec(daySection);
  if (!linkMatch) {
    throw new Error(
      `Inget Beach Tour-evenemang hittades den ${day} ${SV_MONTHS[month]} ${year} i kalendern.`
    );
  }

  const href = linkMatch[1];
  return href.startsWith("http") ? href : `https://www.vkbjarke.se${href}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityUrl, weekDate } = body as { activityUrl?: string; weekDate?: string };

    let resolvedUrl: string;

    if (weekDate) {
      const date = new Date(weekDate);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Ogiltigt datum." }, { status: 400 });
      }
      resolvedUrl = await discoverActivityUrl(date);
    } else if (activityUrl && typeof activityUrl === "string") {
      if (!isAllowedCalendarUrl(activityUrl)) {
        return NextResponse.json(
          { error: "Ogiltig URL. Ange en aktivitetslänk från vkbjarke.se." },
          { status: 400 }
        );
      }
      resolvedUrl = activityUrl;
    } else {
      return NextResponse.json({ error: "activityUrl eller weekDate krävs." }, { status: 400 });
    }

    const html = await fetchWithSession(resolvedUrl);
    const names = extractAttendeesFromHtml(html);

    return NextResponse.json({ names });
  } catch (error) {
    console.error("Error fetching calendar participants:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Misslyckades att hämta deltagare från kalendern." },
      { status: 500 }
    );
  }
}
