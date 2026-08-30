import { View, ActivityIndicator } from "react-native";
import { Image, type ImageStyle } from "expo-image";
import { useSignedPhotoUrl } from "@/hooks/useMemories";

interface MemoryPhotoProps {
  // Path della foto nel bucket privato (es. `{couple_id}/abc.jpg`).
  path: string;
  className?: string;
  // Usiamo ImageStyle (compatibile con ViewStyle per le proprietà di layout usate).
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
        className={`bg-hair items-center justify-center ${className ?? ""}`}
        style={style as object}
      >
        <ActivityIndicator size="small" color="#a8562e" />
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
