import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

const PRESET_TAGS = ["amore ❤️", "divertente 😂", "nota 📝", "festeggiamo 🎉", "da discutere 🤔"];

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  coupleId: string;
  authorId: string;
  queryKey: unknown[];
}

export function CreatePostModal({ visible, onClose, coupleId, authorId, queryKey }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        content: content.trim(),
        tags: selectedTags,
        couple_id: coupleId,
        author_id: authorId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      setContent("");
      setSelectedTags([]);
      onClose();
    } catch {
      showAlert("Errore", "Impossibile pubblicare il post. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setContent("");
    setSelectedTags([]);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
          <Pressable onPress={handleClose} className="py-1 px-2">
            <Text className="text-base text-gray-500">Annulla</Text>
          </Pressable>
          <Text className="text-base font-semibold text-gray-900">Nuovo post</Text>
          <Pressable
            onPress={submit}
            disabled={!content.trim() || loading}
            className={`py-1.5 px-4 rounded-full ${content.trim() && !loading ? "bg-blue-500" : "bg-gray-200"}`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className={`text-sm font-semibold ${content.trim() ? "text-white" : "text-gray-400"}`}>
                Pubblica
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          {/* Text input */}
          <TextInput
            className="text-base text-gray-800 min-h-28 leading-relaxed"
            placeholder="Cosa vuoi condividere con il tuo partner?"
            placeholderTextColor="#9ca3af"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            autoFocus
            textAlignVertical="top"
          />
          <Text className="text-xs text-gray-400 text-right mt-1 mb-5">
            {content.length}/500
          </Text>

          {/* Tag selector */}
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tag (opzionale)
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {PRESET_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full border ${
                    selected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-600"}`}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
