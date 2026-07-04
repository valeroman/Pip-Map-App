import { supabase } from '@/lib/supabase';

export const MIN_DISTANCE_METERS = 15; // no transmitir si me moví menos de esto
export const MIN_INTERVAL_MS = 5000; // no transmitir más seguido que esto

export type LiveLocationPoint = {
  groupId: string;
  userId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
};

export type LocationHistoryPoint = {
  groupId: string;
  userId: string;
  lat: number;
  lng: number;
};

export async function upsertLiveLocation(point: LiveLocationPoint): Promise<void> {
  const { error } = await supabase.from('live_locations').upsert(
    {
      group_id: point.groupId,
      user_id: point.userId,
      lat: point.lat,
      lng: point.lng,
      heading: point.heading,
      speed: point.speed,
      sharing: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) console.error('upsertLiveLocation error:', error.message);
}

export async function insertLocationHistory(point: LocationHistoryPoint): Promise<void> {
  const { error } = await supabase.from('location_history').insert({
    group_id: point.groupId,
    user_id: point.userId,
    lat: point.lat,
    lng: point.lng,
  });

  if (error) console.error('insertLocationHistory error:', error.message);
}

export async function setLiveLocationSharing(userId: string, sharing: boolean): Promise<void> {
  const { error } = await supabase
    .from('live_locations')
    .update({ sharing, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) console.error('setLiveLocationSharing error:', error.message);
}
