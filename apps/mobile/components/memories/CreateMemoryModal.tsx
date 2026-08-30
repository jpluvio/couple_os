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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { MEMORIES_QUERY_KEY } from "@/hooks/useMemories";

const PRESET_TAGS = ["viaggio ✈️", "anniversario 💍", "cena 🍝", "famiglia 👨‍👩‍👧", "avventura 🏔️", "casa 🏡"];

// Limite massimo di foto per memoria (enforce lato UI, come da schema).
const MAX_PHOTOS = 5;

// Foto selezionata localmente, prima dell'upload.
interface PickedPhoto {
  uri: string;
  // Estensione dedotta dal nome/mime, per il nome file su Storage.
  ext: string;
  mimeType: string;
}

interface CreateMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  coupleId: string;
  authorId: string;
}

export function CreateMemoryModal({ visible, onClose, coupleId, authorId }: CreateMemoryModalProps) {
  const [content, setContent] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // Apre la galleria e aggiunge le foto selezionate (fino al limite di 5).
  async function pickPhotos() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      showAlert("Limite raggiunto", `Puoi aggiungere al massimo ${MAX_PHOTOS} foto.`);
      return;
    }

    // Su web il permesso non è richiesto; su nativo sì.
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert("Permesso negato", "Concedi l'accesso alla galleria per aggiungere foto.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled) return;

    const picked: PickedPhoto[] = result.assets.slice(0, remaining).map((a) => {
      const mimeType = a.mimeType ?? "image/jpeg";
      const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
      return { uri: a.uri, ext, mimeType };
    });

    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  // Carica una foto nel bucket privato sotto `{couple_id}/...` e ritorna il path salvato.
  async function uploadPhoto(photo: PickedPhoto): Promise<string> {
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${photo.ext}`;
    const path = `${coupleId}/${filename}`;

    // Leggiamo il file come ArrayBuffer: funziona sia su web sia su nativo.
    const response = await fetch(photo.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("memories")
      .upload(path, arrayBuffer, { contentType: photo.mimeType, upsert: false });
    if (error) throw error;

    return path;
  }

  async function submit() {
    // Serve almeno del testo oppure almeno una foto.
    if (!content.trim() && photos.length === 0) return;
    setLoading(true);
    try {
      // 1) Upload delle foto -> array di path.
      const photoPaths = await Promise.all(photos.map(uploadPhoto));

      // 2) Insert della memoria.
      const { error } = await supabase.from("memories").insert({
        content: content.trim() || null,
        tags: selectedTags,
        photos: photoPaths,
        date,
        couple_id: coupleId,
        author_id: authorId,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY(coupleId) });
      reset();
      onClose();
    } catch {
      showAlert("Errore", "Impossibile salvare la memoria. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setContent("");
    setDate(new Date().toISOString().slice(0, 10));
    setSelectedTags([]);
    setPhotos([]);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  const canSubmit = (content.trim().length > 0 || photos.length > 0) && !loading;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-card"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-line">
          <Pressable onPress={handleClose} className="py-1 px-2">
            <Text className="text-base text-muted">Annulla</Text>
          </Pressable>
          <Text className="text-base font-semibold text-ink">Nuova memoria</Text>
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            className={`py-1.5 px-4 rounded-full ${canSubmit ? "bg-accent" : "bg-line"}`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className={`text-sm font-semibold ${canSubmit ? "text-white" : "text-soft"}`}>
                Salva
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          {/* Foto */}
          <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Foto ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {photos.map((p, i) => (
              <View key={p.uri + i} className="relative">
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: 88, height: 88, borderRadius: 12 }}
                  contentFit="cover"
                />
                <Pressable
                  onPress={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-black/70 rounded-full items-center justify-center"
                >
                  <Text className="text-white text-xs" style={{ lineHeight: 14 }}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable
                onPress={pickPhotos}
                className="w-22 h-22 rounded-card border border-dashed border-line items-center justify-center bg-paper"
                style={{ width: 88, height: 88 }}
              >
                <Text className="text-2xl text-soft">+</Text>
                <Text className="text-[10px] text-soft mt-0.5">Aggiungi</Text>
              </Pressable>
            )}
          </View>

          {/* Data */}
          <Text className="text-xs font-semibold text-muted uppercase tracking-wide mt-5 mb-2">
            Data
          </Text>
          <TextInput
            className="border border-line rounded-card px-3 py-2.5 text-base text-ink"
            placeholder="AAAA-MM-GG"
            placeholderTextColor="#a49a8e"
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
          />

          {/* Testo */}
          <Text className="text-xs font-semibold text-muted uppercase tracking-wide mt-5 mb-2">
            Racconto
          </Text>
          <TextInput
            className="text-base text-ink min-h-24 leading-relaxed border border-line rounded-card px-3 py-2.5"
            placeholder="Racconta questo momento..."
            placeholderTextColor="#a49a8e"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text className="text-xs text-soft text-right mt-1">{content.length}/1000</Text>

          {/* Tag */}
          <Text className="text-xs font-semibold text-muted uppercase tracking-wide mt-5 mb-2">
            Tag (opzionale)
          </Text>
          <View className="flex-row flex-wrap mb-8" style={{ gap: 8 }}>
            {PRESET_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full border ${
                    selected ? "bg-accent border-accent" : "bg-card border-line"
                  }`}
                >
                  <Text className={`text-sm font-medium ${selected ? "text-white" : "text-muted"}`}>
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
