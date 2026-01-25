import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";

export interface MapBounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export function useFlights(bounds?: MapBounds | null) {
  return useQuery({
    queryKey: [api.flights.list.path, bounds],
    queryFn: async () => {
      let url = api.flights.list.path;
      if (bounds) {
        const params = new URLSearchParams();
        params.append("lamin", bounds.lamin.toString());
        params.append("lomin", bounds.lomin.toString());
        params.append("lamax", bounds.lamax.toString());
        params.append("lomax", bounds.lomax.toString());
        url += `?${params.toString()}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch flight data");
      return api.flights.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,  // 5 seconds - minimum for authenticated users
    staleTime: 4000,        // 4 seconds
    retry: 5,
    retryDelay: (attempt) => Math.min(attempt * 1000, 5000),
    placeholderData: keepPreviousData,
  });
}

export function useTrack(icao24: string | null) {
  return useQuery({
    queryKey: [api.flights.track.path, icao24],
    queryFn: async () => {
      if (!icao24) return null;
      const res = await fetch(api.flights.track.path.replace(":icao24", icao24));
      if (!res.ok) throw new Error("Failed to fetch track data");
      return api.flights.track.responses[200].parse(await res.json());
    },
    enabled: !!icao24,
    staleTime: 4000,  // 4 seconds
  });
}

export function useSearchHistory() {
  const query = useQuery({
    queryKey: [api.history.list.path],
    queryFn: async () => {
      const res = await fetch(api.history.list.path);
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.history.list.responses[200].parse(await res.json());
    },
  });

  const mutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(api.history.add.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, timestamp: Math.floor(Date.now() / 1000) }),
      });
      if (!res.ok) throw new Error("Failed to save history");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.history.list.path] });
    },
  });

  return { ...query, addHistory: mutation.mutate };
}
