import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We don't necessarily need to persist flights in DB, but we need a schema file.
// We can store user preferences or search history if needed.
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  timestamp: integer("timestamp").notNull(),
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({ id: true });
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

// Non-DB types for OpenSky API
export const flightSchema = z.object({
  icao24: z.string(),
  callsign: z.string(),
  originCountry: z.string(),
  timePosition: z.number().nullable(),
  lastContact: z.number(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  baroAltitude: z.number().nullable(),
  onGround: z.boolean(),
  velocity: z.number().nullable(),
  trueTrack: z.number().nullable(),
  verticalRate: z.number().nullable(),
  geoAltitude: z.number().nullable(),
  squawk: z.string().nullable(),
  spi: z.boolean(),
  positionSource: z.number(),
});

export type Flight = z.infer<typeof flightSchema>;

export const flightResponseSchema = z.object({
  time: z.number(),
  states: z.array(flightSchema)
});

export const trackPointSchema = z.object({
  time: z.number(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  baroAltitude: z.number().nullable(),
  trueTrack: z.number().nullable(),
  onGround: z.boolean(),
});

export type TrackPoint = z.infer<typeof trackPointSchema>;

export const trackResponseSchema = z.object({
  icao24: z.string(),
  path: z.array(trackPointSchema),
});

export type TrackResponse = z.infer<typeof trackResponseSchema>;

export const searchHistoryResponseSchema = z.array(z.object({
  id: z.number(),
  query: z.string(),
  timestamp: z.number(),
}));
