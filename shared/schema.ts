import { z } from "zod";

// Search query schema - requires either playerName OR teamName (or both), plus gameDate
export const searchQuerySchema = z.object({
  playerName: z.string().optional().default(""),
  teamName: z.string().optional().default(""),
  gameDate: z.string().min(1, "Game date is required"),
}).refine(
  (data) => data.playerName.trim().length > 0 || data.teamName.trim().length > 0,
  { message: "Either player name or team name is required", path: ["teamName"] }
);

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// Box score link result
export interface BoxScoreLink {
  id: string;
  provider: string;
  providerType: "official" | "third-party";
  league: string;
  url: string;
  description: string;
  linkType: "search" | "direct";
}

export interface SearchResult {
  query: SearchQuery;
  links: BoxScoreLink[];
  matchInfo: {
    playerName: string;
    teamName: string;
    gameDate: string;
    formattedDate: string;
  };
}

// Supported leagues
export const LEAGUES = [
  { id: "nba", name: "NBA", sport: "basketball" },
  { id: "mlb", name: "MLB", sport: "baseball" },
  { id: "nfl", name: "NFL", sport: "football" },
  { id: "nhl", name: "NHL", sport: "hockey" },
  { id: "mls", name: "MLS", sport: "soccer" },
] as const;

export type LeagueId = typeof LEAGUES[number]["id"];

// Popular teams for autocomplete suggestions
export const POPULAR_TEAMS = [
  // NBA
  { name: "Los Angeles Lakers", league: "nba" },
  { name: "Golden State Warriors", league: "nba" },
  { name: "Boston Celtics", league: "nba" },
  { name: "Miami Heat", league: "nba" },
  { name: "Chicago Bulls", league: "nba" },
  { name: "New York Knicks", league: "nba" },
  { name: "Brooklyn Nets", league: "nba" },
  { name: "Philadelphia 76ers", league: "nba" },
  { name: "Phoenix Suns", league: "nba" },
  { name: "Dallas Mavericks", league: "nba" },
  // MLB
  { name: "New York Yankees", league: "mlb" },
  { name: "Los Angeles Dodgers", league: "mlb" },
  { name: "Boston Red Sox", league: "mlb" },
  { name: "Chicago Cubs", league: "mlb" },
  { name: "San Francisco Giants", league: "mlb" },
  { name: "Houston Astros", league: "mlb" },
  { name: "Atlanta Braves", league: "mlb" },
  { name: "Philadelphia Phillies", league: "mlb" },
  // NFL
  { name: "Dallas Cowboys", league: "nfl" },
  { name: "New England Patriots", league: "nfl" },
  { name: "Green Bay Packers", league: "nfl" },
  { name: "Kansas City Chiefs", league: "nfl" },
  { name: "San Francisco 49ers", league: "nfl" },
  { name: "Philadelphia Eagles", league: "nfl" },
  { name: "Buffalo Bills", league: "nfl" },
  { name: "Miami Dolphins", league: "nfl" },
  // NHL
  { name: "Toronto Maple Leafs", league: "nhl" },
  { name: "Montreal Canadiens", league: "nhl" },
  { name: "Boston Bruins", league: "nhl" },
  { name: "New York Rangers", league: "nhl" },
  { name: "Chicago Blackhawks", league: "nhl" },
  { name: "Pittsburgh Penguins", league: "nhl" },
  { name: "Vegas Golden Knights", league: "nhl" },
  // MLS
  { name: "LA Galaxy", league: "mls" },
  { name: "Inter Miami", league: "mls" },
  { name: "Atlanta United", league: "mls" },
  { name: "Seattle Sounders", league: "mls" },
  { name: "LAFC", league: "mls" },
] as const;
