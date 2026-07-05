import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { UseLocationState } from '@/hooks/useLocation';
import {
  MIN_DISTANCE_METERS,
  MIN_INTERVAL_MS,
  insertLocationHistory,
  setLiveLocationSharing,
  upsertLiveLocation,
} from '@/lib/locationTransmission';

export type LocationTransmissionState = {
  sharing: boolean;
  routePoints: { lat: number; lng: number }[];
  groupId: string | null;
  error: string | null;
};

// Haversine, distancia en metros entre dos puntos lat/lng.
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useLocationTransmission(
  location: UseLocationState,
  requestedSharing: boolean,
): LocationTransmissionState {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const { groupId, loading: groupLoading } = useGroup();
  const error = !groupLoading && !groupId ? 'SIN GRUPO ASIGNADO' : null;

  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  const lastTransmittedRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const forceNextWriteRef = useRef(false);
  const hasActivatedRef = useRef(false);

  // Detecta transiciones ON/OFF del switch, desacoplado de los ticks de GPS:
  // al pasar a OFF hay que escribir sharing=false ya, sin esperar el próximo tick.
  useEffect(() => {
    if (!userId) return;

    if (requestedSharing) {
      hasActivatedRef.current = true;
      forceNextWriteRef.current = true;
    } else if (hasActivatedRef.current) {
      setLiveLocationSharing(userId, false);
    }
  }, [requestedSharing, userId]);

  useEffect(() => {
    if (!userId || !groupId || !location.coords || !requestedSharing) return;

    const point = location.coords;
    const now = Date.now();
    const last = lastTransmittedRef.current;
    const distance = last ? distanceMeters(last, point) : Infinity;
    const elapsed = last ? now - last.timestamp : Infinity;
    const passesThrottle = distance >= MIN_DISTANCE_METERS && elapsed >= MIN_INTERVAL_MS;

    if (!forceNextWriteRef.current && !passesThrottle) return;

    forceNextWriteRef.current = false;
    lastTransmittedRef.current = { lat: point.lat, lng: point.lng, timestamp: now };

    upsertLiveLocation({
      groupId,
      userId,
      lat: point.lat,
      lng: point.lng,
      heading: location.heading,
      speed: location.speed,
    });
    insertLocationHistory({ groupId, userId, lat: point.lat, lng: point.lng });
    setRoutePoints((prev) => [...prev, { lat: point.lat, lng: point.lng }]);
  }, [userId, groupId, requestedSharing, location.coords, location.heading, location.speed]);

  return { sharing: requestedSharing, routePoints, groupId, error };
}
