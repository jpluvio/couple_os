import { type ReactNode, useRef } from "react";
import { Text, Pressable, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { showAlert } from "@/lib/alert";

/**
 * Avvolge una riga di lista e mostra "Elimina" trascinandola verso sinistra.
 *
 * L'eliminazione passa sempre da una conferma: lo swipe è un gesto facile da
 * innescare per sbaglio scorrendo la lista. Dopo la conferma — o dopo un
 * annullamento — la riga si richiude da sola, altrimenti resterebbe aperta
 * sopra un elemento che non esiste più.
 */
export function SwipeToDelete({
  children,
  onDelete,
  confirmTitle = "Eliminare?",
  confirmMessage,
}: {
  children: ReactNode;
  onDelete: () => void | Promise<void>;
  confirmTitle?: string;
  confirmMessage?: string;
}) {
  const ref = useRef<SwipeableMethods>(null);

  function askThenDelete() {
    showAlert(confirmTitle, confirmMessage, [
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          try {
            await onDelete();
          } finally {
            ref.current?.close();
          }
        },
      },
      { text: "Annulla", style: "cancel", onPress: () => ref.current?.close() },
    ]);
  }

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={askThenDelete}
          accessibilityRole="button"
          accessibilityLabel="Elimina"
          className="justify-center"
        >
          <View className="bg-red-500 rounded-xl items-center justify-center px-5 mr-4 h-full">
            <Text className="text-white text-xl">🗑️</Text>
            <Text className="text-white text-xs font-semibold mt-0.5">Elimina</Text>
          </View>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
