import { View, ActivityIndicator } from "react-native";
import { Image, type ImageStyle } from "expo-image";
import { useSignedPhotoUrl } from "@/hooks/useMemories";

interface MemoryPhotoProps {
  // Path of the photo in the private bucket (e.g. `{couple_id}/abc.jpg`).
  path: string;
  className?: string;
  // ImageStyle is used (compatible with ViewStyle for the layout props we set).
  style?: ImageStyle;
  contentFit?: "cover" | "contain";
}

/**
 * Mostra una foto di una memoria risolvendo al volo il signed URL
 * dal bucket privato `memories`.
 */
export function MemoryPhoto({ path, className, style, contentFit = "cover" }: MemoryPhotoProps) {
  const { data: url, isLoading } = useSignedPhotoUrl(path);

  if (isLoading || !url) {
    return (
      <View
        className={`bg-gray-100 items-center justify-center ${className ?? ""}`}
        style={style as object}
      >
        <ActivityIndicator size="small" color="#0e82ea" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      className={className}
      style={style}
      contentFit={contentFit}
      transition={150}
    />
  );
}
