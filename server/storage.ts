import { type SearchQuery, type SearchResult, type BoxScoreLink } from "@shared/schema";
import { findGame, generateDirectUrls, fetchNbaGameId, fetchMlbGameId, searchPlayerTeam, type GameInfo } from "./sportsApi";

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
  const searchTerm = query.teamName || query.playerName || "";
  const searchQuery = encodeURIComponent(`${query.teamName} ${query.playerName} ${displayDate} box score`.trim());
  
  leagues.forEach(league => {
    const leagueUpper = league.toUpperCase();
    
    // ESPN search as fallback
    links.push({
      id: `espn-${league}-search`,
      provider: "ESPN (Search)",
      providerType: "third-party",
      league: leagueUpper,
      url: `https://www.espn.com/search/_/q/${encodeURIComponent(`${searchTerm} ${displayDate} ${leagueUpper}`.trim())}`,
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
    let teamNameToUse = query.teamName || "";
    let resolvedPlayerTeam: { playerName: string; teamName: string; league: string } | null = null;
    
    // If no team name provided but player name is, look up the player's team
    if (!teamNameToUse && query.playerName) {
      const playerTeam = await searchPlayerTeam(query.playerName);
      if (playerTeam) {
        teamNameToUse = playerTeam.teamName;
        resolvedPlayerTeam = {
          playerName: playerTeam.playerName,
          teamName: playerTeam.teamName,
          league: playerTeam.league,
        };
      }
    }
    
    // Use teamName to detect league and find game
    const searchTerm = teamNameToUse || query.playerName || "";
    const leagues = detectLeague(searchTerm);
    
    // Try to find the game using sports APIs
    const game = teamNameToUse ? await findGame(teamNameToUse, query.gameDate, leagues) : null;
    
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
      
      // For NBA games, add NBA.com links
      if (game.league === "NBA") {
        const [year, month, day] = query.gameDate.split("-");
        
        // Try to fetch NBA game ID for direct box score link
        const nbaGame = await fetchNbaGameId(query.gameDate, game.homeTeamAbbr, game.awayTeamAbbr);
        
        if (nbaGame) {
          // NBA.com direct box score URL format: https://www.nba.com/game/{away}-vs-{home}-{gameId}/box-score
          links.unshift({
            id: "nba-com-boxscore",
            provider: "NBA.com",
            providerType: "official",
            league: "NBA",
            url: `https://www.nba.com/game/${nbaGame.awayAbbr}-vs-${nbaGame.homeAbbr}-${nbaGame.gameId}/box-score`,
            description: `Official NBA box score - ${game.awayTeam} @ ${game.homeTeam}`,
            linkType: "direct"
          });
        } else {
          // Fallback: Link to NBA.com schedule page for that date
          links.unshift({
            id: "nba-com-schedule",
            provider: "NBA.com",
            providerType: "official",
            league: "NBA",
            url: `https://www.nba.com/games?date=${year}-${month}-${day}`,
            description: `NBA games on ${formatDateForDisplay(query.gameDate)} - find ${game.awayTeam} @ ${game.homeTeam}`,
            linkType: "search"
          });
        }
        
        // Basketball Reference direct link using date-based URL
        const brDate = `${year}${month}${day}`;
        const homeAbbr = game.homeTeamAbbr.toUpperCase();
        links.push({
          id: "bbref-boxscore",
          provider: "Basketball Reference",
          providerType: "third-party",
          league: "NBA",
          url: `https://www.basketball-reference.com/boxscores/${brDate}0${homeAbbr}.html`,
          description: `Basketball Reference box score - ${game.awayTeam} @ ${game.homeTeam}`,
          linkType: "direct"
        });
      }
      
      // For MLB games, add MLB.com links
      if (game.league === "MLB") {
        const [year, month, day] = query.gameDate.split("-");
        
        // Try to fetch MLB game ID for direct box score link
        const mlbGame = await fetchMlbGameId(query.gameDate, game.homeTeam, game.awayTeam);
        
        if (mlbGame) {
          // MLB.com box score URL format: https://www.mlb.com/gameday/{away-slug}-vs-{home-slug}/{year}/{month}/{day}/{gamePk}/final/box
          links.unshift({
            id: "mlb-com-boxscore",
            provider: "MLB.com",
            providerType: "official",
            league: "MLB",
            url: `https://www.mlb.com/gameday/${mlbGame.awaySlug}-vs-${mlbGame.homeSlug}/${year}/${month}/${day}/${mlbGame.gamePk}/final/box`,
            description: `Official MLB box score - ${mlbGame.awayTeam} @ ${mlbGame.homeTeam}`,
            linkType: "direct"
          });
        }
        
        // Baseball Reference direct link using date-based URL
        const brDate = `${year}${month}${day}`;
        links.push({
          id: "bref-boxscore",
          provider: "Baseball Reference",
          providerType: "third-party",
          league: "MLB",
          url: `https://www.baseball-reference.com/boxes/?date=${year}-${month}-${day}`,
          description: `Baseball Reference games on ${formatDateForDisplay(query.gameDate)}`,
          linkType: "search"
        });
      }
      
      // Add some search fallbacks too
      const displayDate = formatDateForDisplay(query.gameDate);
      links.push({
        id: "sofascore-search",
        provider: "SofaScore",
        providerType: "third-party",
        league: game.league,
        url: `https://www.sofascore.com/search?q=${encodeURIComponent(teamNameToUse || query.playerName)}`,
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
    
    // Include resolved player team info in matchInfo if we looked it up
    const displayTeamName = resolvedPlayerTeam 
      ? `${resolvedPlayerTeam.teamName} (from ${resolvedPlayerTeam.playerName})`
      : query.teamName;
    
    return {
      query,
      links,
      matchInfo: {
        playerName: query.playerName,
        teamName: displayTeamName,
        gameDate: query.gameDate,
        formattedDate,
        ...(resolvedPlayerTeam && { resolvedFromPlayer: true }),
      }
    };
  }
}

export const storage = new MemStorage();
