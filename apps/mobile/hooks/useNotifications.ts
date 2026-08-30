import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTableSubscription } from "@/lib/realtime";
import { useAuth } from "./useAuth";
import type { Notification } from "@/types/database";

const QUERY_KEY = (userId: string) => ["notifications", userId];

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refetch: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const qKey = QUERY_KEY(userId);

  const { data, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });

  // Real-time: nuove notifiche per l'utente corrente
  useTableSubscription(
    userId ? `notifications-${userId}` : null,
    [{ table: "notifications", filter: `recipient_id=eq.${userId}` }],
    () => queryClient.invalidateQueries({ queryKey: qKey })
  );

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", userId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const notifications = data ?? [];

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    loading: isLoading,
    refetch,
    markRead: (id) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  };
}
