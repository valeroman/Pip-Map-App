import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  GroupMember,
  getCurrentUserGroupId,
  getGroupDetails,
  getGroupMembers,
  leaveGroup as leaveGroupApi,
} from '@/lib/group';
import { setLiveLocationSharing } from '@/lib/locationTransmission';

type GroupContextValue = {
  groupId: string | null;
  groupName: string | null;
  joinCode: string | null;
  members: GroupMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  leaveGroup: () => Promise<void>;
};

const GroupContext = createContext<GroupContextValue>({
  groupId: null,
  groupName: null,
  joinCode: null,
  members: [],
  loading: true,
  error: null,
  refresh: async () => {},
  leaveGroup: async () => {},
});

export function GroupProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;

  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveGroup = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);

    try {
      const id = await getCurrentUserGroupId(uid);

      if (!id) {
        setGroupId(null);
        setGroupName(null);
        setJoinCode(null);
        setMembers([]);
        return;
      }

      const [details, groupMembers] = await Promise.all([getGroupDetails(id), getGroupMembers(id)]);

      setGroupId(id);
      setGroupName(details?.name ?? null);
      setJoinCode(details?.join_code ?? null);
      setMembers(groupMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver el grupo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setGroupId(null);
      setGroupName(null);
      setJoinCode(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    resolveGroup(userId);
  }, [userId, authLoading, resolveGroup]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await resolveGroup(userId);
  }, [userId, resolveGroup]);

  const leaveGroup = useCallback(async () => {
    if (!userId || !groupId) return;

    // Apaga la transmisión antes de borrar la membresía para evitar escrituras
    // huérfanas contra un group_id al que ya no se pertenece (ver Identified risks).
    await setLiveLocationSharing(userId, false);
    await leaveGroupApi(groupId, userId);
    await resolveGroup(userId);
  }, [userId, groupId, resolveGroup]);

  return (
    <GroupContext.Provider
      value={{ groupId, groupName, joinCode, members, loading, error, refresh, leaveGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
