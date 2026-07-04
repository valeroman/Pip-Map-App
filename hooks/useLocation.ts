import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export interface UseLocationState {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  status: LocationStatus;
  error: string | null;
}

export function useLocation(): UseLocationState {
  const [state, setState] = useState<UseLocationState>({
    coords: null,
    accuracy: null,
    heading: null,
    speed: null,
    status: "idle",
    error: null,
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      setState((prev) => ({ ...prev, status: "requesting" }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== "granted") {
        setState((prev) => ({ ...prev, status: "denied" }));
        return;
      }

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            setState({
              coords: {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              },
              accuracy: location.coords.accuracy,
              heading: location.coords.heading,
              speed: location.coords.speed,
              status: "granted",
              error: null,
            });
          }
        );
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: "unavailable",
          error: err instanceof Error ? err.message : String(err),
        }));
        return;
      }

      if (cancelled) {
        subscription.remove();
        return;
      }

      setState((prev) => ({ ...prev, status: "granted" }));
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return state;
}
