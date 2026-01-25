import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plane, Navigation, X, Globe, Gauge, ArrowUpRight } from "lucide-react";
import { type Flight } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useSearchHistory } from "@/hooks/use-flights";
import { useEffect } from "react";

interface SidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedFlight: Flight | null;
  onCloseSelection: () => void;
  isLoading?: boolean;
}

export function Sidebar({
  searchQuery,
  onSearchChange,
  selectedFlight,
  onCloseSelection,
  isLoading
}: SidebarProps) {
  const { addHistory } = useSearchHistory();

  // Debounced search history saving
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) return;

    const handler = setTimeout(() => {
      addHistory(searchQuery);
    }, 1000);

    return () => clearTimeout(handler);
  }, [searchQuery, addHistory]);

  return (
    <div className="absolute top-4 left-4 z-[500] flex flex-col gap-4 w-full max-w-sm pointer-events-none">

      {/* Search Bar */}
      <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl shadow-xl pointer-events-auto p-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 h-12 bg-transparent border-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/70"
            placeholder="Search callsign, country, or ICAO..."
          />
        </div>
      </div>

      {/* Flight Detail Card */}
      {selectedFlight && (
        <div className="bg-card/95 backdrop-blur-lg border border-primary/20 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-left-4 duration-300">
          {/* Header with airline strip */}
          <div className="h-2 w-full bg-gradient-to-r from-primary to-blue-600" />

          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold tracking-wider font-mono border border-primary/20">
                    ICAO: {selectedFlight.icao24.toUpperCase()}
                  </span>
                  {selectedFlight.onGround && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-wider font-mono border border-amber-500/20">
                      ON GROUND
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                  {selectedFlight.callsign.trim() || "N/A"}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseSelection}
                className="h-8 w-8 rounded-full hover:bg-white/10 -mt-2 -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 p-4 rounded-xl bg-secondary/50 border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Origin Country</span>
                </div>
                <div className="font-medium text-lg text-foreground">
                  {selectedFlight.originCountry}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Altitude</span>
                </div>
                <div className="font-mono text-xl text-primary font-medium">
                  {selectedFlight.baroAltitude
                    ? Math.round(selectedFlight.baroAltitude).toLocaleString()
                    : "---"}
                  <span className="text-xs text-muted-foreground ml-1">m</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Velocity</span>
                </div>
                <div className="font-mono text-xl text-primary font-medium">
                  {selectedFlight.velocity
                    ? Math.round(selectedFlight.velocity * 3.6).toLocaleString()
                    : "---"}
                  <span className="text-xs text-muted-foreground ml-1">km/h</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Vertical Rate</span>
                </div>
                <div className={cn("font-mono text-xl font-medium flex items-center",
                  (selectedFlight.verticalRate || 0) > 0 ? "text-green-400" :
                    (selectedFlight.verticalRate || 0) < 0 ? "text-red-400" : "text-slate-400"
                )}>
                  {selectedFlight.verticalRate
                    ? `${selectedFlight.verticalRate > 0 ? '+' : ''}${selectedFlight.verticalRate}`
                    : "0"}
                  <span className="text-xs text-muted-foreground ml-1">m/s</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Plane className="w-3.5 h-3.5 rotate-45" />
                  <span>Heading</span>
                </div>
                <div className="font-mono text-xl text-foreground font-medium flex items-center gap-2">
                  {selectedFlight.trueTrack
                    ? Math.round(selectedFlight.trueTrack)
                    : "---"}°
                  {selectedFlight.trueTrack && (
                    <div
                      className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center"
                      style={{ transform: `rotate(${selectedFlight.trueTrack}deg)` }}
                    >
                      <div className="w-0.5 h-2 bg-primary rounded-full -mt-0.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-mono">
                LAST CONTACT: {Math.floor(Date.now() / 1000 - selectedFlight.lastContact)}s ago
              </span>
              <span className="text-xs text-primary/70 font-mono tracking-wider">
                LIVE DATA
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
