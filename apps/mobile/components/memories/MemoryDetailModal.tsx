import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MemoryPhoto } from "./MemoryPhoto";
import { MEMORIES_QUERY_KEY, type MemoryWithAuthor } from "@/hooks/useMemories";

const { width } = Dimensions.get("window");

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

interface MemoryDetailModalProps {
  memory: MemoryWithAuthor | null;
  currentUserId: string;
  coupleId: string;
  onClose: () => void;
}

export function MemoryDetailModal({ memory, currentUserId, coupleId, onClose }: MemoryDetailModalProps) {
  const [activePhoto, setActivePhoto] = useState(0);
  const queryClient = useQueryClient();

  if (!memory) return null;

  const photos = memory.photos ?? [];
  const isAuthor = memory.author_id === currentUserId;

  const initials = memory.author?.name
    ? memory.author.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  function confirmDelete() {
    showAlert("Elimina memoria", "Sei sicuro? L'azione non è reversibile.", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          // Rimuovi le foto dallo Storage, poi la riga.
          if (photos.length > 0) {
            await supabase.storage.from("memories").remove(photos);
          }
          await supabase.from("memories").delete().eq("id", memory!.id);
          queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY(coupleId) });
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={!!memory} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="py-1 px-2">
            <Text className="text-base text-gray-500">Chiudi</Text>
          </Pressable>
          <Text className="text-base font-semibold text-gray-900">Memoria</Text>
          {isAuthor ? (
            <Pressable onPress={confirmDelete} className="py-1 px-2">
              <Text className="text-base text-red-500">Elimina</Text>
            </Pressable>
          ) : (
            <View className="w-12" />
          )}
        </View>

        <ScrollView className="flex-1">
          {/* Galleria foto */}
          {photos.length > 0 && (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
              >
                {photos.map((path, i) => (
                  <MemoryPhoto
                    key={path + i}
                    path={path}
                    style={{ width, height: width }}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View className="flex-row justify-center mt-2" style={{ gap: 6 }}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === activePhoto ? "bg-blue-500" : "bg-gray-300"}`}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <View className="p-4">
            {/* Autore + data */}
            <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                <Text className="text-xs font-bold text-blue-600">{initials}</Text>
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-800">
                  {memory.author?.name ?? "Utente"}
                </Text>
                <Text className="text-xs text-gray-400">{formatDate(memory.date)}</Text>
              </View>
            </View>

            {/* Contenuto */}
            {memory.content ? (
              <Text className="text-gray-800 text-base leading-relaxed">{memory.content}</Text>
            ) : null}

            {/* Tag */}
            {memory.tags.length > 0 && (
              <View className="flex-row flex-wrap mt-4" style={{ gap: 6 }}>
                {memory.tags.map((tag) => (
                  <View key={tag} className="bg-blue-50 px-2.5 py-1 rounded-full">
                    <Text className="text-xs text-blue-600 font-medium">{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
