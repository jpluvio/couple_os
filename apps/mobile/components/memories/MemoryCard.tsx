import { View, Text, Pressable } from "react-native";
import { MemoryPhoto } from "./MemoryPhoto";
import type { MemoryWithAuthor } from "@/hooks/useMemories";

// Formatta la data della memoria in italiano (es. "4 giugno 2026").
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

interface MemoryCardProps {
  memory: MemoryWithAuthor;
  onPress: () => void;
}

export function MemoryCard({ memory, onPress }: MemoryCardProps) {
  const photos = memory.photos ?? [];
  const cover = photos[0];
  const extra = photos.length - 1;

  const initials = memory.author?.name
    ? memory.author.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Pressable
      onPress={onPress}
      className="bg-card mx-4 mb-3 rounded-card overflow-hidden"
      style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      {/* Copertina (prima foto) */}
      {cover && (
        <View className="relative">
          <MemoryPhoto path={cover} style={{ width: "100%", height: 200 }} />
          {extra > 0 && (
            <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">+{extra} foto</Text>
            </View>
          )}
        </View>
      )}

      <View className="p-4">
        {/* Header: autore + data */}
        <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
          <View className="w-7 h-7 rounded-full bg-tint items-center justify-center">
            <Text className="text-[10px] font-bold text-accent">{initials}</Text>
          </View>
          <Text className="text-sm font-semibold text-ink">
            {memory.author?.name ?? "Utente"}
          </Text>
          <Text className="text-xs text-soft">· {formatDate(memory.date)}</Text>
        </View>

        {/* Contenuto */}
        {memory.content ? (
          <Text className="text-ink text-base leading-relaxed" numberOfLines={3}>
            {memory.content}
          </Text>
        ) : null}

        {/* Tag */}
        {memory.tags.length > 0 && (
          <View className="flex-row flex-wrap mt-3" style={{ gap: 4 }}>
            {memory.tags.map((tag) => (
              <View key={tag} className="bg-tint px-2 py-0.5 rounded-full">
                <Text className="text-xs text-accent font-medium">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}
