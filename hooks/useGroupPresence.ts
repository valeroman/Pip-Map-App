import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { supabase } from '@/lib/supabase';

const RECENT_WINDOW_MS = 120_000; // ventana para considerar "activo" un live_location

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

// Estado interno por user_id: MemberPresence más el flag `sharing`, que no se
// expone en el tipo público pero se necesita para filtrar a los inactivos.
type PresenceEntry = MemberPresence & { sharing: boolean };

export function useGroupPresence(): { members: MemberPresence[]; count: number } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const { groupId, members: groupMembers } = useGroup();
  const groupMembersRef = useRef(groupMembers);

  const [presence, setPresence] = useState<Record<string, PresenceEntry>>({});

  useEffect(() => {
    groupMembersRef.current = groupMembers;
  }, [groupMembers]);

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
  }, [presence]);

  return { members, count: members.length };
}
