import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View, type ViewStyle } from "react-native";

/**
 * Placeholder pulsante mostrato al posto dello spinner mentre una lista carica.
 * Riproduce la forma del contenuto che sta per arrivare, così il layout non
 * "salta" quando i dati compaiono.
 *
 * L'animazione è sull'opacità: sul nativo gira sul driver nativo, sul web no
 * (react-native-web non lo supporta e stamperebbe un warning a ogni mount).
 */
function usePulse() {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

export function Skeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = usePulse();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: width ?? "100%", height, borderRadius: radius, backgroundColor: "#e5e7eb", opacity }, style]}
    />
  );
}

/** Righe-scheda generiche: board, memories, spese, notifiche. */
export function SkeletonCardList({ count = 4, showAvatar = false }: { count?: number; showAvatar?: boolean }) {
  return (
    <View style={{ gap: 8 }} className="px-4 pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="bg-card rounded-card px-4 py-3.5">
          <View className="flex-row items-center" style={{ gap: 10 }}>
            {showAvatar && <Skeleton width={36} height={36} radius={18} />}
            <View className="flex-1" style={{ gap: 7 }}>
              <Skeleton width="45%" height={11} />
              <Skeleton width="80%" height={13} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Righe compatte con icona a sinistra: dispensa, todo, lista della spesa. */
export function SkeletonRowList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 8 }} className="px-4 pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="bg-card rounded-card px-4 py-3 flex-row items-center" style={{ gap: 10 }}>
          <Skeleton width={26} height={26} radius={13} />
          <View className="flex-1" style={{ gap: 6 }}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="35%" height={10} />
          </View>
          <Skeleton width={54} height={14} />
        </View>
      ))}
    </View>
  );
}
