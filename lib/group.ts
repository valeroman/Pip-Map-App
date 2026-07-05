import { supabase } from '@/lib/supabase';

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
};

export type GroupMember = {
  user_id: string;
  display_name: string;
};

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

export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error) throw new Error(error.message);
  return data as Group;
}

export async function joinGroup(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  if (error) throw new Error(error.message);
  return data as Group;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function getGroupDetails(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, owner_id, join_code')
    .eq('id', groupId)
    .maybeSingle();

  if (error) {
    console.error('getGroupDetails error:', error.message);
    return null;
  }

  return data;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (memberError) {
    console.error('getGroupMembers error:', memberError.message);
    return [];
  }

  const userIds = (memberRows ?? []).map((row) => row.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  if (profilesError) {
    console.error('getGroupMembers error:', profilesError.message);
    return [];
  }

  return (profiles ?? []).map((profile) => ({
    user_id: profile.id,
    display_name: profile.display_name,
  }));
}
