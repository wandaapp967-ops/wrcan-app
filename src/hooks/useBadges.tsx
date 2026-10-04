import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const { data = 0 } = useQuery({
    queryKey: ["unread-count", user?.id],
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_unread_count");
      if (error) return 0;
      return (data as number) ?? 0;
    },
  });
  return data;
}

export function useControlAccess() {
  const { user } = useAuth();
  const { data = false, isLoading } = useQuery({
    queryKey: ["control-access", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_view_control_room");
      if (error) return false;
      return !!data;
    },
  });
  return { allowed: data, loading: !!user && isLoading };
}
