import { View, Text, Pressable, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PostWithRelations = {
  id: string;
  content: string;
  pinned: boolean;
  tags: string[];
  author_id: string;
  couple_id: string;
  created_at: string;
  updated_at: string;
  author: { name: string | null; avatar_url: string | null } | null;
  reactions: Array<{ id: string; emoji: string; user_id: string; post_id: string }>;
};

const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "😢"];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g`;
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

interface PostCardProps {
  post: PostWithRelations;
  currentUserId: string;
  queryKey: unknown[];
}

export function PostCard({ post, currentUserId, queryKey }: PostCardProps) {
  const queryClient = useQueryClient();

  const reactions = REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: post.reactions.filter((r) => r.emoji === emoji).length,
    userReacted: post.reactions.some((r) => r.emoji === emoji && r.user_id === currentUserId),
  }));

  async function toggleReaction(emoji: string, userReacted: boolean) {
    // Optimistic update
    queryClient.setQueryData(queryKey, (old: PostWithRelations[] | undefined) =>
      old?.map((p) => {
        if (p.id !== post.id) return p;
        if (userReacted) {
          return { ...p, reactions: p.reactions.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId)) };
        }
        const tempReaction = { id: `temp-${Date.now()}`, emoji, user_id: currentUserId, post_id: post.id };
        return { ...p, reactions: [...p.reactions, tempReaction] };
      })
    );

    if (userReacted) {
      await supabase.from("reactions").delete()
        .eq("post_id", post.id).eq("user_id", currentUserId).eq("emoji", emoji);
    } else {
      await supabase.from("reactions").insert({ post_id: post.id, user_id: currentUserId, emoji });
    }
    queryClient.invalidateQueries({ queryKey });
  }

  function handleLongPress() {
    if (post.author_id !== currentUserId) return;
    Alert.alert("Post", undefined, [
      {
        text: post.pinned ? "Rimuovi pin" : "📌 Fissa in cima",
        onPress: async () => {
          await supabase.from("posts").update({ pinned: !post.pinned }).eq("id", post.id);
          queryClient.invalidateQueries({ queryKey });
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete post", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await supabase.from("posts").delete().eq("id", post.id);
                queryClient.invalidateQueries({ queryKey });
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const initials = post.author?.name
    ? post.author.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Pressable
      onLongPress={handleLongPress}
      className="bg-white mx-4 mb-3 rounded-2xl p-4"
      style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-xs font-bold text-blue-600">{initials}</Text>
          </View>
          <View>
            <Text className="text-sm font-semibold text-gray-800">
              {post.author?.name ?? "Utente"}
            </Text>
            <Text className="text-xs text-gray-400">{relativeTime(post.created_at)}</Text>
          </View>
        </View>
        {post.pinned && <Text className="text-base">📌</Text>}
      </View>

      {/* Content */}
      <Text className="text-gray-800 text-base leading-relaxed mb-3">{post.content}</Text>

      {/* Tags */}
      {post.tags.length > 0 && (
        <View className="flex-row flex-wrap mb-3" style={{ gap: 4 }}>
          {post.tags.map((tag) => (
            <View key={tag} className="bg-blue-50 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-blue-600 font-medium">{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reactions */}
      <View className="flex-row" style={{ gap: 6 }}>
        {reactions.map(({ emoji, count, userReacted }) => (
          <Pressable
            key={emoji}
            onPress={() => toggleReaction(emoji, userReacted)}
            className={`flex-row items-center px-2 py-1 rounded-full border ${
              userReacted ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
            }`}
          >
            <Text className="text-sm">{emoji}</Text>
            {count > 0 && (
              <Text
                className={`text-xs ml-1 font-semibold ${userReacted ? "text-blue-600" : "text-gray-500"}`}
              >
                {count}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}
