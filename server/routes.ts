import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { type Flight } from "@shared/schema";
import axios, { AxiosRequestConfig } from "axios";

import { storage } from "./storage";

// Simple in-memory cache
let flightCache: { time: number; data: Flight[] } | null = null;
const trackCache = new Map<string, { time: number; data: any }>();
// OpenSky authenticated users get 5-second resolution (minimum latency)
const CACHE_TTL_MS = 5000;
const TRACK_CACHE_TTL_MS = 5000;

// OAuth2 Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Get OAuth2 access token from OpenSky
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log("No OAuth2 credentials configured, using anonymous access");
    return null;
  }

  // Check if we have a valid cached token (with 60s buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  try {
    console.log("Fetching new OAuth2 access token...");
    const response = await axios.post(
      "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    accessToken = response.data.access_token;
    // Token expires in 30 minutes (1800 seconds), convert to milliseconds
    tokenExpiry = Date.now() + (response.data.expires_in || 1800) * 1000;
    console.log("✅ OAuth2 token obtained successfully");
    return accessToken;
  } catch (error: any) {
    console.error("❌ Failed to get OAuth2 token:", error.response?.data || error.message);
    return null;
  }
}

// OpenSky API authentication config using OAuth2
async function getOpenSkyConfig(): Promise<AxiosRequestConfig> {
  const token = await getAccessToken();

  if (token) {
    return {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    };
  }
  return {};
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.flights.list.path, async (req, res) => {
    try {
      // Use India bounding box as default, or use provided params
      const lamin = req.query.lamin || process.env.INDIA_LAMIN || "6.5";
      const lomin = req.query.lomin || process.env.INDIA_LOMIN || "68.0";
      const lamax = req.query.lamax || process.env.INDIA_LAMAX || "35.5";
      const lomax = req.query.lomax || process.env.INDIA_LOMAX || "97.5";
      const now = Date.now();

      // Always use bounding box (default to India)
      const bboxUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

      // Check cache first
      if (flightCache && (now - flightCache.time < CACHE_TTL_MS)) {
        console.log("Serving cached India flight data");
        return res.json({ time: Math.floor(now / 1000), states: flightCache.data });
      }

      console.log(`Radar scanning India airspace: ${lamin}, ${lomin} to ${lamax}, ${lomax}`);
      const response = await axios.get(bboxUrl, await getOpenSkyConfig());
      const rawStates = response.data.states || [];

      const mappedFlights: Flight[] = rawStates.slice(0, 800).map((s: any[]) => ({
        icao24: s[0],
        callsign: (s[1] || "").trim(),
        originCountry: s[2],
        timePosition: s[3],
        lastContact: s[4],
        longitude: s[5],
        latitude: s[6],
        baroAltitude: s[7],
        onGround: s[8],
        velocity: s[9],
        trueTrack: s[10],
        verticalRate: s[11],
        geoAltitude: s[13],
        squawk: s[14],
        spi: s[15],
        positionSource: s[16]
      })).filter((f: Flight) => f.longitude !== null && f.latitude !== null);

      // Cache the results
      flightCache = {
        time: now,
        data: mappedFlights
      };

      console.log(`Found ${mappedFlights.length} flights over India`);
      res.json({ time: response.data.time, states: mappedFlights });

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn("OpenSky API Rate Limit hit. Serving last cached data.");
      } else if (error.response?.status === 401) {
        console.error("OpenSky API Authentication failed (401). Check your OPENSKY_USERNAME and OPENSKY_PASSWORD in .env");
        console.error("Response:", error.response?.data);
      } else {
        console.error("Error fetching flight data:", error.message || error);
        if (error.response) {
          console.error("Status:", error.response.status);
          console.error("Data:", error.response.data);
        }
      }

      if (flightCache) {
        return res.json({ time: Math.floor(Date.now() / 1000), states: flightCache.data });
      }
      res.json({ time: Math.floor(Date.now() / 1000), states: [] });

    }
  });

  app.get("/api/flights/:icao24/track", async (req, res) => {
    try {
      const { icao24 } = req.params;
      const now = Date.now();

      if (trackCache.has(icao24)) {
        const cached = trackCache.get(icao24)!;
        if (now - cached.time < TRACK_CACHE_TTL_MS) {
          return res.json(cached.data);
        }
      }

      // OpenSky API: /tracks/all?icao24=...
      const response = await axios.get(`https://opensky-network.org/api/tracks/all?icao24=${icao24}`, await getOpenSkyConfig());

      const mappedTrack = {
        icao24: response.data.icao24,
        path: (response.data.path || []).map((p: any[]) => ({
          time: p[0],
          latitude: p[1],
          longitude: p[2],
          baroAltitude: p[3],
          trueTrack: p[4],
          onGround: p[5]
        }))
      };

      trackCache.set(icao24, { time: now, data: mappedTrack });
      res.json(mappedTrack);

    } catch (error: any) {
      if (error.response?.status === 404) {
        return res.status(404).json({ message: "No track data available for this flight" });
      }
      console.error("Error fetching track data:", error);
      res.status(500).json({ message: "Failed to fetch track data" });
    }
  });

  app.get(api.history.list.path, async (_req, res) => {
    try {
      const history = await storage.getSearchHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  app.post(api.history.add.path, async (req, res) => {
    try {
      const item = await storage.addSearchHistory(req.body);
      res.status(201).json({ id: item.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to save search history" });
    }
  });

  return httpServer;
}
