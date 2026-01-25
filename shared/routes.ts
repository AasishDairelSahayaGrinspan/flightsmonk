import { z } from "zod";
import { flightResponseSchema, trackResponseSchema, searchHistoryResponseSchema, insertSearchHistorySchema } from "./schema";

export const api = {
  flights: {
    list: {
      method: "GET" as const,
      path: "/api/flights",
      responses: {
        200: flightResponseSchema,
        500: z.object({ message: z.string() })
      }
    },
    track: {
      method: "GET" as const,
      path: "/api/flights/:icao24/track",
      responses: {
        200: trackResponseSchema,
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  },
  history: {
    list: {
      method: "GET" as const,
      path: "/api/history",
      responses: {
        200: searchHistoryResponseSchema,
        500: z.object({ message: z.string() })
      }
    },
    add: {
      method: "POST" as const,
      path: "/api/history",
      body: insertSearchHistorySchema,
      responses: {
        201: z.object({ id: z.number() }),
        500: z.object({ message: z.string() })
      }
    }
  }
};
