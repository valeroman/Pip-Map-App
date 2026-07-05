import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { supabase } from '@/lib/supabase';

const RECENT_WINDOW_MS = 120_000; // ventana para considerar "activo" un live_location
const STALE_CHECK_INTERVAL_MS = 15_000; // recalcula staleness aunque no lleguen eventos nuevos

export type MemberPresence = {
  userId: string;
  displayName: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
  routePoints: { lat: number; lng: number }[];
};

type LiveLocationRow = {
  user_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  sharing: boolean;
  updated_at: string;
};

type LocationHistoryRow = {
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
};

// Estado interno por user_id: MemberPresence más el flag `sharing`, que no se
// expone en el tipo público pero se necesita para filtrar a los inactivos.
type PresenceEntry = MemberPresence & { sharing: boolean };

export function useGroupPresence(): { members: MemberPresence[]; count: number } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const { groupId, members: groupMembers } = useGroup();
  const groupMembersRef = useRef(groupMembers);

  const [presence, setPresence] = useState<Record<string, PresenceEntry>>({});
  const [staleTick, setStaleTick] = useState(0);

  useEffect(() => {
    groupMembersRef.current = groupMembers;
  }, [groupMembers]);

  // Sin eventos nuevos, `presence` no cambia y el filtro de staleness de
  // `members` (abajo) nunca se re-evalúa. Este tick fuerza esa reevaluación
  // periódica para sacar a alguien cuyo `live_locations` quedó viejo.
  useEffect(() => {
    const interval = setInterval(() => setStaleTick((tick) => tick + 1), STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPresence({});

    if (!groupId || !userId) return;

    const channel = supabase
      .channel(`live_locations:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
          filter: `group_id=eq.${groupId}`,
        },
        (payload: RealtimePostgresChangesPayload<LiveLocationRow>) => {
          const row = payload.new as LiveLocationRow;
          if (!row?.user_id || row.user_id === userId) return;

          setPresence((prev) => {
            const displayName =
              groupMembersRef.current.find((member) => member.user_id === row.user_id)
                ?.display_name ?? '???';
            const existing = prev[row.user_id];

            return {
              ...prev,
              [row.user_id]: {
                userId: row.user_id,
                displayName,
                lat: row.lat,
                lng: row.lng,
                heading: row.heading,
                speed: row.speed,
                updatedAt: row.updated_at,
                sharing: row.sharing,
                routePoints: existing?.routePoints ?? [],
              },
            };
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_history',
          filter: `group_id=eq.${groupId}`,
        },
        (payload: RealtimePostgresChangesPayload<LocationHistoryRow>) => {
          const row = payload.new as LocationHistoryRow;
          if (!row?.user_id || row.user_id === userId) return;

          setPresence((prev) => {
            const existing = prev[row.user_id];
            const displayName =
              existing?.displayName ??
              groupMembersRef.current.find((member) => member.user_id === row.user_id)
                ?.display_name ??
              '???';

            return {
              ...prev,
              [row.user_id]: {
                userId: row.user_id,
                displayName,
                lat: existing?.lat ?? row.lat,
                lng: existing?.lng ?? row.lng,
                heading: existing?.heading ?? null,
                speed: existing?.speed ?? null,
                updatedAt: existing?.updatedAt ?? row.created_at,
                sharing: existing?.sharing ?? true,
                routePoints: [...(existing?.routePoints ?? []), { lat: row.lat, lng: row.lng }],
              },
            };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, userId]);

  const members = useMemo<MemberPresence[]>(() => {
    const now = Date.now();

    return Object.values(presence)
      .filter((entry) => entry.sharing && now - Date.parse(entry.updatedAt) <= RECENT_WINDOW_MS)
      .map(({ sharing: _sharing, ...member }) => member);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presence, staleTick]);

  return { members, count: members.length };
}
