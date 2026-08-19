import { useEffect, useState } from "react";
import { View, Text, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { PostCard, type PostWithRelations } from "@/components/board/PostCard";
import { CreatePostModal } from "@/components/board/CreatePostModal";
import { NotificationBell } from "@/components/ui/NotificationBell";

const QUERY_KEY = (coupleId: string) => ["posts", coupleId];

export default function BoardScreen() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const coupleId = couple?.id ?? "";
  const qKey = QUERY_KEY(coupleId);

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, author:users!author_id(name, avatar_url), reactions(*)")
        .eq("couple_id", coupleId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PostWithRelations[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`board-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `couple_id=eq.${coupleId}` },
        () => { queryClient.invalidateQueries({ queryKey: qKey }); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => { queryClient.invalidateQueries({ queryKey: qKey }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  if (!user || !couple) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pt-2 pb-3">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Board</Text>
          <Text className="text-sm text-gray-500 mt-0.5">Your shared board</Text>
        </View>
        <NotificationBell />
      </View>

      <FlashList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} currentUserId={user.id} queryKey={qKey} />
        )}
        estimatedItemSize={160}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0e82ea" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-24 px-8">
              <Text className="text-5xl mb-4">📋</Text>
              <Text className="text-lg font-semibold text-gray-700 text-center">
                No posts yet
              </Text>
              <Text className="text-sm text-gray-400 text-center mt-1">
                Be the first to share something with your partner.
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => setShowCreate(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center"
        style={{
          shadowColor: "#0e82ea",
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>+</Text>
      </Pressable>

      <CreatePostModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        coupleId={coupleId}
        authorId={user.id}
        queryKey={qKey}
      />
    </SafeAreaView>
  );
}
