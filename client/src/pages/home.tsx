import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Search, 
  Calendar, 
  User, 
  Users, 
  Copy, 
  Check, 
  ExternalLink,
  Trophy,
  Loader2,
  Info
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { searchQuerySchema, type SearchQuery, type SearchResult, type BoxScoreLink } from "@shared/schema";

function LinkCard({ link, onCopy }: { link: BoxScoreLink; onCopy: (url: string) => void }) {
  const [copied, setCopied] = useState(false);
  const isDirect = link.linkType === "direct";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    onCopy(link.url);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg hover-elevate active-elevate-2",
        isDirect ? "bg-green-500/5 border border-green-500/20" : "bg-muted/50"
      )}
      data-testid={`link-card-${link.id}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center border",
          isDirect ? "bg-green-500/10 border-green-500/30" : "bg-background border-border"
        )}>
          <span className={cn(
            "text-xs font-semibold uppercase",
            isDirect ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}>
            {link.league}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate" data-testid={`text-provider-${link.id}`}>
              {link.provider}
            </p>
            {isDirect && (
              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                Direct Link
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {link.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          data-testid={`button-copy-${link.id}`}
          aria-label="Copy link"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          asChild
          data-testid={`button-open-${link.id}`}
        >
          <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function ResultsSection({ result, onCopy }: { result: SearchResult; onCopy: (url: string) => void }) {
  const officialLinks = result.links.filter(l => l.providerType === "official");
  const thirdPartyLinks = result.links.filter(l => l.providerType === "third-party");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center pb-4 border-b border-border">
        <p className="text-sm text-muted-foreground">Showing results for</p>
        <h2 className="text-xl font-semibold mt-1" data-testid="text-match-info">
          {result.matchInfo.playerName} - {result.matchInfo.teamName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-game-date">
          {result.matchInfo.formattedDate}
        </p>
      </div>

      {result.links.some(l => l.linkType === "direct") ? (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 text-sm border border-green-500/20">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 dark:text-green-300">
            Game found! Direct links to box scores are available below.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 text-sm">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            No game found for this date. Search links are provided to help you find the box score.
          </p>
        </div>
      )}

      {officialLinks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Official League Sites
            </h3>
            <Badge variant="secondary" className="text-xs">
              {officialLinks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {officialLinks.map(link => (
              <LinkCard key={link.id} link={link} onCopy={onCopy} />
            ))}
          </div>
        </div>
      )}

      {thirdPartyLinks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Third-Party Providers
            </h3>
            <Badge variant="secondary" className="text-xs">
              {thirdPartyLinks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {thirdPartyLinks.map(link => (
              <LinkCard key={link.id} link={link} onCopy={onCopy} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="text-center pb-4 border-b border-border">
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto mt-2" />
        <Skeleton className="h-4 w-24 mx-auto mt-2" />
      </div>
      {[1, 2].map(section => (
        <div key={section}>
          <Skeleton className="h-4 w-40 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Trophy className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Find Box Score Links</h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
        Enter a player name, team, and game date to generate search links that help you find box scores from official league sites and sports providers.
      </p>
    </div>
  );
}

export default function Home() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [result, setResult] = useState<SearchResult | null>(null);
  const { toast } = useToast();

  const form = useForm<SearchQuery>({
    resolver: zodResolver(searchQuerySchema),
    defaultValues: {
      playerName: "",
      teamName: "",
      gameDate: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: SearchQuery) => {
      const response = await apiRequest("POST", "/api/search", data);
      return await response.json() as SearchResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SearchQuery) => {
    searchMutation.mutate(data);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      form.setValue("gameDate", format(selectedDate, "yyyy-MM-dd"));
    }
  };

  const handleCopy = (url: string) => {
    toast({
      title: "Link copied",
      description: "The URL has been copied to your clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-xl hidden sm:block">Box Score Finder</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Find Any Box Score
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Generate search links to find game stats from official league sites and popular sports providers.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Search for a Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="playerName" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Player Name
                  </Label>
                  <Input
                    id="playerName"
                    placeholder="e.g., LeBron James"
                    {...form.register("playerName")}
                    data-testid="input-player-name"
                  />
                  {form.formState.errors.playerName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.playerName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamName" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Team Name
                  </Label>
                  <Input
                    id="teamName"
                    placeholder="e.g., Los Angeles Lakers"
                    {...form.register("teamName")}
                    data-testid="input-team-name"
                  />
                  {form.formState.errors.teamName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.teamName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Game Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                        data-testid="button-date-picker"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.gameDate && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.gameDate.message}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                size="lg"
                disabled={searchMutation.isPending}
                data-testid="button-search"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Generate Links
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {searchMutation.isPending ? (
              <LoadingSkeleton />
            ) : result ? (
              <ResultsSection result={result} onCopy={handleCopy} />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <footer className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Supported leagues: NBA, MLB, NFL, NHL, MLS
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Links generated for ESPN, official league sites, SofaScore, Yahoo Sports, and more.
          </p>
        </footer>
      </main>
    </div>
  );
}
