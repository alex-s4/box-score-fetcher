import { type SearchQuery, type SearchResult, type BoxScoreLink } from "@shared/schema";
import { findGame, generateDirectUrls, type GameInfo } from "./sportsApi";

export interface IStorage {
  generateBoxScoreLinks(query: SearchQuery): Promise<SearchResult>;
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function detectLeague(teamName: string): string[] {
  const teamLower = teamName.toLowerCase();
  const leagues: string[] = [];
  
  // NBA teams
  const nbaTeams = ["lakers", "warriors", "celtics", "heat", "bulls", "knicks", "nets", "76ers", "suns", "mavericks", "bucks", "clippers", "nuggets", "grizzlies", "pelicans", "hawks", "hornets", "magic", "pistons", "pacers", "cavaliers", "raptors", "wizards", "timberwolves", "thunder", "blazers", "jazz", "kings", "spurs", "rockets"];
  if (nbaTeams.some(t => teamLower.includes(t))) leagues.push("nba");
  
  // MLB teams
  const mlbTeams = ["yankees", "dodgers", "red sox", "cubs", "giants", "astros", "braves", "phillies", "mets", "cardinals", "padres", "mariners", "rangers", "twins", "guardians", "orioles", "rays", "blue jays", "white sox", "royals", "tigers", "angels", "athletics", "brewers", "reds", "pirates", "rockies", "diamondbacks", "nationals", "marlins"];
  if (mlbTeams.some(t => teamLower.includes(t))) leagues.push("mlb");
  
  // NFL teams
  const nflTeams = ["cowboys", "patriots", "packers", "chiefs", "49ers", "eagles", "bills", "dolphins", "jets", "ravens", "steelers", "bengals", "browns", "titans", "colts", "texans", "jaguars", "broncos", "raiders", "chargers", "seahawks", "rams", "cardinals", "falcons", "panthers", "saints", "buccaneers", "bears", "lions", "vikings", "commanders"];
  if (nflTeams.some(t => teamLower.includes(t))) leagues.push("nfl");
  
  // NHL teams
  const nhlTeams = ["maple leafs", "canadiens", "bruins", "rangers", "blackhawks", "penguins", "golden knights", "avalanche", "oilers", "flames", "canucks", "kraken", "kings", "sharks", "ducks", "coyotes", "stars", "blues", "wild", "predators", "jets", "lightning", "panthers", "hurricanes", "capitals", "flyers", "devils", "islanders", "sabres", "senators", "red wings", "blue jackets"];
  if (nhlTeams.some(t => teamLower.includes(t))) leagues.push("nhl");
  
  // MLS teams
  const mlsTeams = ["galaxy", "inter miami", "atlanta united", "sounders", "lafc", "timbers", "whitecaps", "earthquakes", "fc dallas", "dynamo", "sporting kc", "minnesota united", "real salt lake", "colorado rapids", "austin fc", "nashville sc", "charlotte fc", "dc united", "new york red bulls", "nycfc", "new england revolution", "philadelphia union", "columbus crew", "chicago fire", "cf montreal", "toronto fc", "orlando city", "cincinnati"];
  if (mlsTeams.some(t => teamLower.includes(t))) leagues.push("mls");
  
  // Default to all major leagues if no specific match
  if (leagues.length === 0) {
    leagues.push("nba", "mlb", "nfl", "nhl");
  }
  
  return leagues;
}

function generateFallbackLinks(query: SearchQuery, leagues: string[]): BoxScoreLink[] {
  const links: BoxScoreLink[] = [];
  const displayDate = formatDateForDisplay(query.gameDate);
  const searchQuery = encodeURIComponent(`${query.teamName} ${query.playerName} ${displayDate} box score`);
  
  leagues.forEach(league => {
    const leagueUpper = league.toUpperCase();
    
    // ESPN search as fallback
    links.push({
      id: `espn-${league}-search`,
      provider: "ESPN (Search)",
      providerType: "third-party",
      league: leagueUpper,
      url: `https://www.espn.com/search/_/q/${encodeURIComponent(query.teamName + " " + displayDate + " " + leagueUpper)}`,
      description: `Search ESPN for ${leagueUpper} box score`,
      linkType: "search"
    });
  });
  
  // Google search as reliable fallback
  links.push({
    id: `google-search`,
    provider: "Google Search",
    providerType: "third-party",
    league: leagues[0]?.toUpperCase() || "ALL",
    url: `https://www.google.com/search?q=${searchQuery}`,
    description: "Search Google for box score results",
    linkType: "search"
  });
  
  return links;
}

export class MemStorage implements IStorage {
  async generateBoxScoreLinks(query: SearchQuery): Promise<SearchResult> {
    const leagues = detectLeague(query.teamName);
    
    // Try to find the game using sports APIs
    const game = await findGame(query.teamName, query.gameDate, leagues);
    
    let links: BoxScoreLink[] = [];
    
    if (game) {
      // We found the game - generate direct URLs with real game IDs
      const directUrls = generateDirectUrls(game);
      links = directUrls.map((url, index) => ({
        id: `${url.provider.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        provider: url.provider,
        providerType: url.providerType,
        league: url.league,
        url: url.url,
        description: url.description,
        linkType: "direct" as const
      }));
      
      // Add some search fallbacks too
      const displayDate = formatDateForDisplay(query.gameDate);
      links.push({
        id: "sofascore-search",
        provider: "SofaScore",
        providerType: "third-party",
        league: game.league,
        url: `https://www.sofascore.com/search?q=${encodeURIComponent(query.teamName)}`,
        description: "Search SofaScore for detailed match statistics",
        linkType: "search"
      });
    } else {
      // No game found - generate search-based fallback links
      links = generateFallbackLinks(query, leagues);
    }
    
    const gameDate = new Date(query.gameDate);
    const formattedDate = gameDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    
    return {
      query,
      links,
      matchInfo: {
        playerName: query.playerName,
        teamName: query.teamName,
        gameDate: query.gameDate,
        formattedDate
      }
    };
  }
}

export const storage = new MemStorage();
