// Sports API integration for fetching real game IDs

// ESPN to NBA abbreviation mapping (ESPN uses different codes for some teams)
const ESPN_TO_NBA_ABBR: Record<string, string> = {
  "NO": "NOP",    // New Orleans Pelicans
  "NY": "NYK",    // New York Knicks
  "GS": "GSW",    // Golden State Warriors
  "SA": "SAS",    // San Antonio Spurs
  "UTAH": "UTA",  // Utah Jazz
  "PHX": "PHO",   // Phoenix Suns (sometimes)
  "BKN": "BKN",   // Brooklyn Nets
  "WSH": "WAS",   // Washington Wizards
};

// NBA abbreviation to lowercase for URL construction
const NBA_TEAM_ABBR: Record<string, string> = {
  "ATL": "atl", "BOS": "bos", "BKN": "bkn", "CHA": "cha", "CHI": "chi",
  "CLE": "cle", "DAL": "dal", "DEN": "den", "DET": "det", "GSW": "gsw",
  "HOU": "hou", "IND": "ind", "LAC": "lac", "LAL": "lal", "MEM": "mem",
  "MIA": "mia", "MIL": "mil", "MIN": "min", "NOP": "nop", "NYK": "nyk",
  "OKC": "okc", "ORL": "orl", "PHI": "phi", "PHX": "phx", "POR": "por",
  "SAC": "sac", "SAS": "sas", "TOR": "tor", "UTA": "uta", "WAS": "was",
  // ESPN abbreviations mapped to NBA lowercase
  "NO": "nop", "NY": "nyk", "GS": "gsw", "SA": "sas", "UTAH": "uta",
  "PHO": "phx", "WSH": "was",
};

export function getNbaAbbr(espnAbbr: string): string {
  const upper = espnAbbr.toUpperCase();
  return NBA_TEAM_ABBR[upper] || espnAbbr.toLowerCase();
}

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

// Extract just the team nickname (e.g., "Lakers" from "Los Angeles Lakers")
function getTeamNickname(displayName: string): string {
  const parts = displayName.split(" ");
  // Usually the last word is the nickname, but some teams have multi-word nicknames
  const twoWordTeams = ["trail blazers", "blue jays", "red sox", "white sox", "maple leafs", "golden knights"];
  const lastTwo = parts.slice(-2).join(" ").toLowerCase();
  if (twoWordTeams.includes(lastTwo)) {
    return normalizeTeamName(lastTwo);
  }
  return normalizeTeamName(parts[parts.length - 1] || displayName);
}

function teamMatches(searchTeam: string, teamName: string, teamAbbr: string, displayName: string): boolean {
  const search = normalizeTeamName(searchTeam);
  const normalizedTeamName = normalizeTeamName(teamName);
  const normalizedDisplayName = normalizeTeamName(displayName);
  const normalizedAbbr = normalizeTeamName(teamAbbr);
  const nickname = getTeamNickname(displayName);
  
  // Exact match on abbreviation (e.g., "LAL" matches Lakers)
  if (normalizedAbbr === search) return true;
  
  // Search term matches nickname exactly (e.g., "lakers" matches "Lakers")
  if (search === nickname) return true;
  
  // Full team name contains search term or vice versa
  if (normalizedDisplayName === search || normalizedTeamName === search) return true;
  
  // Search term contains the full team name
  if (search.includes(normalizedDisplayName) || search.includes(normalizedTeamName)) return true;
  
  // Team name contains the search term (but search must be at least 4 chars to avoid false positives)
  if (search.length >= 4 && normalizedDisplayName.includes(search)) return true;
  
  // Search contains the nickname (e.g., "los angeles lakers" contains "lakers")
  if (nickname.length >= 4 && search.includes(nickname)) return true;
  
  return false;
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

// Helper to check if two team abbreviations match (accounting for ESPN/NBA differences)
function abbrMatches(espnAbbr: string, nbaAbbr: string): boolean {
  const espnUpper = espnAbbr.toUpperCase();
  const nbaUpper = nbaAbbr.toUpperCase();
  
  // Direct match
  if (espnUpper === nbaUpper) return true;
  
  // Check if ESPN abbr maps to this NBA abbr
  const mapped = ESPN_TO_NBA_ABBR[espnUpper];
  if (mapped && mapped === nbaUpper) return true;
  
  // Also check reverse mapping (in case NBA uses the ESPN-style abbr)
  return getNbaAbbr(espnAbbr) === nbaAbbr.toLowerCase();
}

// Fetch NBA game ID from NBA's scoreboard API for a specific date
export async function fetchNbaGameId(date: string, homeTeamAbbr: string, awayTeamAbbr: string): Promise<{ gameId: string; awayAbbr: string; homeAbbr: string } | null> {
  try {
    const [year, month, day] = date.split("-");
    const targetDate = `${year}-${month}-${day}`;
    
    // Try the full schedule endpoint (most reliable for historical/future games)
    const scheduleUrl = `https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json`;
    const scheduleResponse = await fetch(scheduleUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (scheduleResponse.ok) {
      const data = await scheduleResponse.json();
      const gameDates = data?.leagueSchedule?.gameDates || [];
      
      for (const gameDate of gameDates) {
        for (const game of gameDate.games || []) {
          const gameHomeAbbr = game.homeTeam?.teamTricode?.toUpperCase();
          const gameAwayAbbr = game.awayTeam?.teamTricode?.toUpperCase();
          const gameDateStr = game.gameDateUTC?.substring(0, 10);
          
          // Match by date and teams (using flexible abbreviation matching)
          if (gameDateStr === targetDate) {
            const homeMatch = abbrMatches(homeTeamAbbr, gameHomeAbbr) || abbrMatches(homeTeamAbbr, gameAwayAbbr);
            const awayMatch = abbrMatches(awayTeamAbbr, gameAwayAbbr) || abbrMatches(awayTeamAbbr, gameHomeAbbr);
            
            if (homeMatch && awayMatch) {
              return {
                gameId: game.gameId,
                awayAbbr: gameAwayAbbr.toLowerCase(),
                homeAbbr: gameHomeAbbr.toLowerCase()
              };
            }
          }
        }
      }
    }
    
    // Fallback: Try the date-specific scoreboard API (works for recent/live games)
    const scoreboardUrl = `https://stats.nba.com/stats/scoreboardv3?GameDate=${year}-${month}-${day}&LeagueID=00`;
    
    const response = await fetch(scoreboardUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.nba.com/",
        "Origin": "https://www.nba.com",
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const games = data?.scoreboard?.games || [];
      
      for (const game of games) {
        const gameHomeAbbr = game.homeTeam?.teamTricode?.toUpperCase();
        const gameAwayAbbr = game.awayTeam?.teamTricode?.toUpperCase();
        
        const homeMatch = abbrMatches(homeTeamAbbr, gameHomeAbbr) || abbrMatches(homeTeamAbbr, gameAwayAbbr);
        const awayMatch = abbrMatches(awayTeamAbbr, gameAwayAbbr) || abbrMatches(awayTeamAbbr, gameHomeAbbr);
        
        if (homeMatch && awayMatch) {
          return {
            gameId: game.gameId,
            awayAbbr: gameAwayAbbr.toLowerCase(),
            homeAbbr: gameHomeAbbr.toLowerCase()
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching NBA game ID:", error);
    return null;
  }
}

// Slugify team name for MLB URLs (e.g., "Blue Jays" -> "blue-jays")
export function slugifyTeamName(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Extract team nickname from full name (e.g., "Toronto Blue Jays" -> "Blue Jays")
function extractMlbNickname(fullName: string): string {
  // Common city prefixes to remove
  const cityPatterns = [
    /^(Los Angeles|New York|San Francisco|San Diego|St\. Louis|Kansas City|Tampa Bay|Texas|Arizona|Colorado|Minnesota|Oakland|Seattle|Baltimore|Boston|Chicago|Cincinnati|Cleveland|Detroit|Houston|Miami|Milwaukee|Philadelphia|Pittsburgh|Toronto|Washington|Atlanta)\s+/i
  ];
  
  let nickname = fullName;
  for (const pattern of cityPatterns) {
    nickname = nickname.replace(pattern, "");
  }
  return nickname.trim();
}

// Fetch MLB game ID (gamePk) from MLB StatsAPI
export async function fetchMlbGameId(date: string, homeTeamName: string, awayTeamName: string): Promise<{ 
  gamePk: string; 
  homeSlug: string; 
  awaySlug: string;
  homeTeam: string;
  awayTeam: string;
} | null> {
  try {
    const [year, month, day] = date.split("-");
    const mlbDate = `${year}-${month}-${day}`;
    
    // MLB StatsAPI schedule endpoint
    const url = `https://statsapi.mlb.com/api/v1/schedule?date=${mlbDate}&sportId=1`;
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      console.log("MLB StatsAPI response not ok:", response.status);
      return null;
    }
    
    const data = await response.json();
    const dates = data?.dates || [];
    
    if (dates.length === 0) return null;
    
    const games = dates[0]?.games || [];
    
    for (const game of games) {
      // The API uses team.name for full name (e.g., "Toronto Blue Jays")
      const gameHomeFull = game.teams?.home?.team?.name || "";
      const gameAwayFull = game.teams?.away?.team?.name || "";
      
      // Extract nicknames for slugs
      const gameHomeNickname = extractMlbNickname(gameHomeFull);
      const gameAwayNickname = extractMlbNickname(gameAwayFull);
      
      // Check if this game matches the teams we're looking for
      const homeMatch = teamMatches(homeTeamName, gameHomeNickname, "", gameHomeFull) ||
                       teamMatches(homeTeamName, gameAwayNickname, "", gameAwayFull);
      const awayMatch = teamMatches(awayTeamName, gameHomeNickname, "", gameHomeFull) ||
                       teamMatches(awayTeamName, gameAwayNickname, "", gameAwayFull);
      
      // Also check if at least one team matches when only one team is provided
      const singleTeamMatch = teamMatches(homeTeamName, gameHomeNickname, "", gameHomeFull) ||
                              teamMatches(homeTeamName, gameAwayNickname, "", gameAwayFull) ||
                              teamMatches(awayTeamName, gameHomeNickname, "", gameHomeFull) ||
                              teamMatches(awayTeamName, gameAwayNickname, "", gameAwayFull);
      
      if ((homeMatch && awayMatch) || singleTeamMatch) {
        return {
          gamePk: String(game.gamePk),
          homeSlug: slugifyTeamName(gameHomeNickname),
          awaySlug: slugifyTeamName(gameAwayNickname),
          homeTeam: gameHomeFull,
          awayTeam: gameAwayFull,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching MLB game ID:", error);
    return null;
  }
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
