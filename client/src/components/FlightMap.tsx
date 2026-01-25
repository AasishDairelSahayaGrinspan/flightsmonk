import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { Plane, Navigation, Wind, Activity, Globe } from "lucide-react";
import { type Flight } from "@shared/schema";
import { useFlights, useTrack } from "@/hooks/use-flights";
import React from "react";

// Cache for icons to prevent memory leaks and unnecessary object creation
const iconCache = new Map<string, L.DivIcon>();

// Helper to get color based on altitude
const getAltitudeColor = (altitude: number | null) => {
  if (altitude === null) return "#94a3b8"; // Slate 400
  if (altitude < 1000) return "#ef4444";   // Red (Landing/Takeoff)
  if (altitude < 3000) return "#f97316";   // Orange
  if (altitude < 6000) return "#facc15";   // Yellow
  if (altitude < 9000) return "#4ade80";   // Green
  if (altitude < 12000) return "#0ea5e9";  // Sky Blue (Cruising)
  return "#a855f7";                        // Purple (High Altitude)
};

// Custom plane icon creator
const getPlaneIcon = (rotation: number, isSelected: boolean, altitude: number | null) => {
  const roundedRotation = Math.round(rotation / 2) * 2; // Precise but cached
  const altitudeColor = getAltitudeColor(altitude);
  const cacheKey = `${roundedRotation}-${isSelected}-${altitudeColor}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const strokeColor = isSelected ? "#ffffff" : altitudeColor;
  const fillColor = isSelected ? "#0ea5e9" : `${altitudeColor}dd`;

  const icon = L.divIcon({
    className: "bg-transparent border-none",
    html: `
      <div class="flight-icon-container" style="transform: rotate(${roundedRotation}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transition: all 15s linear;">
        <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <path d="M21,16 L21,14 L13,9 L13,3.5 C13,2.67 12.33,2 11.5,2 C10.67,2 10,2.67 10,3.5 L10,9 L2,14 L2,16 L10,13.5 L10,19 L8,20.5 L8,22 L11.5,21 L15,22 L15,20.5 L13,19 L13,13.5 L21,16 Z" 
            fill="${fillColor}" 
            stroke="${strokeColor}" 
            stroke-width="1"
          />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  iconCache.set(cacheKey, icon);
  return icon;
};

// Optimized individual Flight Marker
const FlightMarker = React.memo(({
  flight,
  isSelected,
  onSelect
}: {
  flight: Flight;
  isSelected: boolean;
  onSelect: (f: Flight) => void
}) => {
  return (
    <Marker
      position={[flight.latitude!, flight.longitude!]}
      icon={getPlaneIcon(flight.trueTrack || 0, isSelected, flight.baroAltitude)}
      {...({
        eventHandlers: { click: () => onSelect(flight) }
      } as any)}
    >
      <Popup className="custom-popup" closeButton={false}>
        <div className="p-1 min-w-[200px] bg-slate-900/95 text-white rounded-lg border border-white/10 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="font-mono text-xs text-primary/80">ICAO: {flight.icao24.toUpperCase()}</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getAltitudeColor(flight.baroAltitude) }} />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Pos Valid</span>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" style={{ color: getAltitudeColor(flight.baroAltitude) }} />
            {flight.callsign.trim() || "UNKNOWN"}
          </h3>

          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Origin
              </span>
              <span className="text-white font-medium text-right truncate max-w-[100px]">{flight.originCountry}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3 h-3" /> Altitude
              </span>
              <span className="text-white font-mono font-bold" style={{ color: getAltitudeColor(flight.baroAltitude) }}>
                {flight.baroAltitude ? Math.round(flight.baroAltitude * 3.28084).toLocaleString() : "---"} ft
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Wind className="w-3 h-3" /> Velocity
              </span>
              <span className="text-white font-mono">
                {flight.velocity ? Math.round(flight.velocity * 1.94384).toLocaleString() : "---"} knots
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}, (prev, next) => {
  return prev.flight.latitude === next.flight.latitude &&
    prev.flight.longitude === next.flight.longitude &&
    prev.flight.trueTrack === next.flight.trueTrack &&
    prev.flight.baroAltitude === next.flight.baroAltitude &&
    prev.isSelected === next.isSelected;
});


interface FlightMapProps {
  searchQuery: string;
  onSelectFlight: (flight: Flight | null) => void;
  selectedFlightId: string | null;
}

// Component to handle map center updates based on selected flight
function MapController({ selectedFlight, selectedFlightId }: { selectedFlight: Flight | null, selectedFlightId: string | null }) {
  const map = useMap();
  const hasZoomedRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Only fly to the flight when it's first selected (new selection)
    if (selectedFlightId && selectedFlight?.latitude && selectedFlight?.longitude) {
      // Only zoom if this is a new selection we haven't zoomed to yet
      if (hasZoomedRef.current !== selectedFlightId) {
        hasZoomedRef.current = selectedFlightId;
        map.flyTo([selectedFlight.latitude, selectedFlight.longitude], 8, {
          duration: 1.5
        });
      }
    }

    // Reset ref when flight is deselected
    if (!selectedFlightId) {
      hasZoomedRef.current = null;
    }
  }, [selectedFlightId, selectedFlight?.latitude, selectedFlight?.longitude, map]);

  return null;
}

// Legend Data
const ALTITUDE_LEVELS = [
  { label: "Takeoff/Landing", range: "< 1000 ft", color: "#ef4444" },
  { label: "Climbing", range: "1k - 3k ft", color: "#f97316" },
  { label: "Low Cruise", range: "3k - 6k ft", color: "#facc15" },
  { label: "Mid Cruise", range: "6k - 9k ft", color: "#4ade80" },
  { label: "High Cruise", range: "9k - 12k ft", color: "#0ea5e9" },
  { label: "Stratospheric", range: "> 12k ft", color: "#a855f7" },
];

const MAP_MODES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
} as const;

type MapMode = keyof typeof MAP_MODES;

export function FlightMap({ searchQuery, onSelectFlight, selectedFlightId }: FlightMapProps) {
  const [mapMode, setMapMode] = useState<MapMode>("dark");
  const [mapBounds, setMapBounds] = useState<{ lamin: number, lomin: number, lamax: number, lomax: number } | null>(null);
  const { data, isLoading, isError } = useFlights(mapBounds);

  // Component to track map bounds and selection
  function MapEvents() {
    const map = useMap();

    useEffect(() => {
      const updateBounds = () => {
        const bounds = map.getBounds();
        // If zoomed in, use the localized bounding box API
        if (map.getZoom() > 6) {
          setMapBounds({
            lamin: bounds.getSouth(),
            lomin: bounds.getWest(),
            lamax: bounds.getNorth(),
            lomax: bounds.getEast()
          });
        } else {
          // If zoomed out, use the global view (server-side handles this)
          setMapBounds(null);
        }
      };

      map.on("moveend", updateBounds);
      map.on("zoomend", updateBounds);

      // Initial bounds
      updateBounds();

      return () => {
        map.off("moveend", updateBounds);
        map.off("zoomend", updateBounds);
      };
    }, [map]);

    return null;
  }

  // Filter flights for display
  const visibleFlights = useMemo(() => {
    if (!data?.states) return [];

    let filtered = data.states.filter(f => f.latitude !== null && f.longitude !== null);

    // Filter by search query across the entire dataset we have
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.callsign.toLowerCase().includes(lowerQuery) ||
        f.originCountry.toLowerCase().includes(lowerQuery) ||
        f.icao24.toLowerCase().includes(lowerQuery)
      );
    }

    // Performance safety cap for rendering
    return filtered.slice(0, 1000);
  }, [data, searchQuery]);

  // Find the selected flight object
  const selectedFlight = useMemo(() =>
    visibleFlights.find(f => f.icao24 === selectedFlightId) ||
    (data?.states?.find(f => f.icao24 === selectedFlightId) || null),
    [visibleFlights, data, selectedFlightId]);

  const { data: trackData } = useTrack(selectedFlightId);

  const trackPath = useMemo(() => {
    if (!trackData?.path) return [];
    return trackData.path
      .filter(p => p.latitude !== null && p.longitude !== null)
      .map(p => [p.latitude!, p.longitude!] as [number, number]);
  }, [trackData]);

  if (isLoading && !data && !visibleFlights.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
            <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary w-6 h-6" />
          </div>
          <p className="text-sm font-bold font-mono text-primary/60 tracking-[0.3em] uppercase">Initializing Radar</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center p-8 border border-destructive/20 rounded-2xl bg-destructive/5 backdrop-blur-sm max-w-md">
          <Activity className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold text-destructive mb-2">Radar System Offline</h3>
          <p className="text-muted-foreground">Unable to establish connection with flight data servers. Retrying connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden">
      <MapContainer
        center={[20.5937, 78.9629]} // India center
        zoom={5}
        style={{ width: "100%", height: "100%", background: "#0f172a" }}
        zoomControl={false}
        minZoom={3}
        preferCanvas={true}
      >
        <MapEvents />

        <TileLayer
          key={mapMode}
          attribution={mapMode === 'satellite'
            ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
          url={MAP_MODES[mapMode]}
        />

        <ZoomControl position="bottomright" />

        <MapController selectedFlight={selectedFlight} selectedFlightId={selectedFlightId} />

        {/* Flight Track visualization */}
        {trackPath.length > 0 && (
          <>
            <Polyline
              positions={trackPath}
              color="#0ea5e9"
              weight={6}
              opacity={0.2}
              lineJoin="round"
            />
            <Polyline
              positions={trackPath}
              color="#0ea5e9"
              weight={2}
              opacity={0.8}
              dashArray="5, 10"
              lineJoin="round"
            />
          </>
        )}

        {visibleFlights.map((flight) => (
          <FlightMarker
            key={flight.icao24}
            flight={flight}
            isSelected={selectedFlightId === flight.icao24}
            onSelect={onSelectFlight}
          />
        ))}
      </MapContainer>

      {/* Map Mode Selector - positioned below the header */}
      <div className="absolute top-20 right-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {(Object.keys(MAP_MODES) as MapMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border transition-all shadow-md ${mapMode === mode
              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
              : "bg-slate-900/90 text-slate-300 border-white/10 hover:border-white/30 hover:text-white hover:bg-slate-800/90"
              }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Overlay info - Total Flights & Legend */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] flex items-end justify-between pointer-events-none">
        {/* Visible Count */}
        <div className="bg-background/80 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">
              Visible Flights: <span className="text-white font-mono font-bold">{visibleFlights.length}</span>
            </span>
          </div>
        </div>

        {/* Altitude Legend */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-auto max-w-xs md:max-w-none">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2 px-1">Altitude Legend</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ALTITUDE_LEVELS.map((level) => (
              <div key={level.range} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: level.color }} />
                <div className="flex flex-col">
                  <span className="text-[10px] leading-tight text-white font-medium">{level.label}</span>
                  <span className="text-[9px] leading-tight text-slate-400 font-mono">{level.range}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
