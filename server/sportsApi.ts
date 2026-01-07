// Sports API integration for fetching real game IDs

interface ESPNGame {
  id: string;
  date: string;
  name: string;
  shortName: string;
  competitions: Array<{
    id: string;
    competitors: Array<{
      id: string;
      team: {
        id: string;
        name: string;
        abbreviation: string;
        displayName: string;
      };
      homeAway: "home" | "away";
    }>;
  }>;
}

interface ESPNScoreboardResponse {
  events: ESPNGame[];
}

export interface GameInfo {
  espnGameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  gameDate: string;
  league: string;
}

// ESPN API endpoints for different sports
const ESPN_SCOREBOARD_URLS: Record<string, string> = {
  nba: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  mlb: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  nfl: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  nhl: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  mls: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard",
};

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamMatches(searchTeam: string, teamName: string, teamAbbr: string, displayName: string): boolean {
  const search = normalizeTeamName(searchTeam);
  return (
    normalizeTeamName(teamName).includes(search) ||
    normalizeTeamName(displayName).includes(search) ||
    search.includes(normalizeTeamName(teamName)) ||
    search.includes(normalizeTeamName(displayName)) ||
    normalizeTeamName(teamAbbr) === search ||
    search.includes(normalizeTeamName(teamAbbr))
  );
}

export async function fetchGamesByDate(league: string, date: string): Promise<GameInfo[]> {
  const baseUrl = ESPN_SCOREBOARD_URLS[league];
  if (!baseUrl) {
    return [];
  }

  try {
    // ESPN date format: YYYYMMDD
    // Parse the date string directly to avoid timezone issues
    // Input format is "YYYY-MM-DD"
    const [year, month, day] = date.split("-");
    const espnDate = `${year}${month}${day}`;
    
    const url = `${baseUrl}?dates=${espnDate}`;
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "BoxScoreFinder/1.0"
      }
    });

    if (!response.ok) {
      console.error(`ESPN API error for ${league}: ${response.status}`);
      return [];
    }

    const data: ESPNScoreboardResponse = await response.json();
    
    if (!data.events || data.events.length === 0) {
      return [];
    }

    const games: GameInfo[] = [];
    
    for (const event of data.events) {
      if (event.competitions && event.competitions.length > 0) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        if (competitors && competitors.length >= 2) {
          const homeTeam = competitors.find(c => c.homeAway === "home");
          const awayTeam = competitors.find(c => c.homeAway === "away");
          
          if (homeTeam && awayTeam) {
            games.push({
              espnGameId: event.id,
              homeTeam: homeTeam.team.displayName,
              awayTeam: awayTeam.team.displayName,
              homeTeamAbbr: homeTeam.team.abbreviation,
              awayTeamAbbr: awayTeam.team.abbreviation,
              gameDate: date,
              league: league.toUpperCase(),
            });
          }
        }
      }
    }

    return games;
  } catch (error) {
    console.error(`Error fetching ${league} games:`, error);
    return [];
  }
}

export async function findGame(teamName: string, date: string, leagues: string[]): Promise<GameInfo | null> {
  for (const league of leagues) {
    const games = await fetchGamesByDate(league, date);
    
    for (const game of games) {
      if (
        teamMatches(teamName, game.homeTeam, game.homeTeamAbbr, game.homeTeam) ||
        teamMatches(teamName, game.awayTeam, game.awayTeamAbbr, game.awayTeam)
      ) {
        return game;
      }
    }
  }
  
  return null;
}

// Generate direct box score URLs using game IDs
// Note: ESPN game IDs only work for ESPN URLs. Official league sites use different internal IDs
// that require their own API calls to fetch
export function generateDirectUrls(game: GameInfo): Array<{
  provider: string;
  providerType: "official" | "third-party";
  url: string;
  description: string;
  league: string;
}> {
  const urls: Array<{
    provider: string;
    providerType: "official" | "third-party";
    url: string;
    description: string;
    league: string;
  }> = [];
  
  const league = game.league.toLowerCase();
  
  // ESPN uses different URL patterns for different sports
  // Soccer uses /match/ while other sports use /boxscore/
  if (league === "mls") {
    // Soccer/MLS uses /match/ endpoint
    urls.push({
      provider: "ESPN Match Stats",
      providerType: "third-party",
      url: `https://www.espn.com/soccer/match/_/gameId/${game.espnGameId}`,
      description: `ESPN MLS match stats - ${game.awayTeam} @ ${game.homeTeam}`,
      league: game.league,
    });

    urls.push({
      provider: "ESPN Match Summary",
      providerType: "third-party",
      url: `https://www.espn.com/soccer/match/_/gameId/${game.espnGameId}/statistics`,
      description: `ESPN MLS match statistics`,
      league: game.league,
    });
  } else {
    // Other sports (NBA, MLB, NFL, NHL) use /boxscore/
    urls.push({
      provider: "ESPN Box Score",
      providerType: "third-party",
      url: `https://www.espn.com/${league}/boxscore/_/gameId/${game.espnGameId}`,
      description: `ESPN ${game.league} box score - ${game.awayTeam} @ ${game.homeTeam}`,
      league: game.league,
    });

    urls.push({
      provider: "ESPN Game Summary",
      providerType: "third-party",
      url: `https://www.espn.com/${league}/game/_/gameId/${game.espnGameId}`,
      description: `ESPN ${game.league} game summary with all stats`,
      league: game.league,
    });

    urls.push({
      provider: "ESPN Play-by-Play",
      providerType: "third-party",
      url: `https://www.espn.com/${league}/playbyplay/_/gameId/${game.espnGameId}`,
      description: `ESPN ${game.league} play-by-play details`,
      league: game.league,
    });
  }

  return urls;
}
