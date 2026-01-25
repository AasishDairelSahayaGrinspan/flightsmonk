import { useState } from "react";
import { FlightMap } from "@/components/FlightMap";
import { Sidebar } from "@/components/Sidebar";
import { type Flight } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  const handleSelectFlight = (flight: Flight | null) => {
    setSelectedFlight(flight);
    setSelectedFlightId(flight?.icao24 || null);
  };

  return (
    <div className="w-screen h-screen relative bg-background text-foreground overflow-hidden">
      {/* Background Map */}
      <div className="absolute inset-0 z-0">
        <FlightMap 
          searchQuery={searchQuery}
          onSelectFlight={handleSelectFlight}
          selectedFlightId={selectedFlightId}
        />
      </div>

      {/* Header / Brand */}
      <div className="absolute top-0 right-0 p-6 z-[400] pointer-events-none">
        <div className="flex flex-col items-end">
          <h1 className="text-3xl font-display font-bold text-white drop-shadow-md tracking-tighter">
            FLIGHTS<span className="text-primary">MONK</span>
          </h1>
          <p className="text-xs text-white/50 font-mono mt-1">LIVE FLIGHT TRACKER</p>
        </div>
      </div>

      {/* Floating Sidebar Overlay */}
      <Sidebar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFlight={selectedFlight}
        onCloseSelection={() => handleSelectFlight(null)}
      />
    </div>
  );
}
