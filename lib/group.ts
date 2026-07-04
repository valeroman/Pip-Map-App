import { supabase } from '@/lib/supabase';

// Se asume que el usuario pertenece a un solo grupo (ver Scope de Spec 03).
export async function getCurrentUserGroupId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getCurrentUserGroupId error:', error.message);
    return null;
  }

  return data?.group_id ?? null;
}
