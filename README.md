# FlightsMonk

A working FlightRadar-style web app that shows moving aircraft on a map using OpenSky Network data.

## Stack

- **Backend**: Node.js, Express, Axios (Fetches and caches OpenSky data)
- **Frontend**: React, Leaflet, Tailwind CSS (Displays map and aircraft markers)
- **Data Source**: OpenSky Network API

## Features

- **Live Tracking**: Polls OpenSky Network API every 10 seconds.
- **Caching**: Server-side in-memory caching to respect API limits.
- **Map**: Full-screen interactive map using OpenStreetMap tiles.
- **Details**: Click on any aircraft to see callsign, altitude, velocity, and country.
- **Search**: Filter flights by callsign.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5000](http://localhost:5000)

## Docker

Build and run the container:

```bash
docker build -t flight-radar .
docker run -p 5000:5000 flight-radar
```

## Environment Variables

- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: PostgreSQL connection string (required for Drizzle ORM, though main flight data is in-memory)
