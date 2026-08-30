import { Alert, Platform } from "react-native";

/**
 * `Alert.alert` di react-native-web è uno stub vuoto (`static alert() {}`):
 * sul web ogni conferma di eliminazione e ogni messaggio d'errore sparisce
 * senza lasciare traccia, e l'utente vede solo un pulsante che non fa nulla.
 *
 * `showAlert` mantiene la firma di `Alert.alert` — così la sostituzione è un
 * cambio di import — e sul web ricade su `confirm()` / `alert()` del browser.
 *
 * Nota: i dialog nativi del browser sono brutti e bloccanti. Vanno bene per
 * non perdere l'informazione, ma la soluzione definitiva è un modale in-app.
 */
export type AlertButton = {
  text?: string;
  onPress?: () => void | Promise<void>;
  style?: "default" | "cancel" | "destructive";
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = [title, message].filter(Boolean).join("\n\n");
  const win = globalThis as unknown as {
    alert?: (m: string) => void;
    confirm?: (m: string) => boolean;
  };

  // Nessun pulsante, o un solo pulsante: è un avviso, non una scelta.
  if (!buttons || buttons.length <= 1) {
    win.alert?.(body);
    void buttons?.[0]?.onPress?.();
    return;
  }

  // Con più pulsanti serve una scelta: il primo non-"cancel" è l'azione,
  // coerentemente con l'ordine usato da Alert.alert su iOS.
  const action = buttons.find((b) => b.style !== "cancel") ?? buttons[0];
  const cancel = buttons.find((b) => b.style === "cancel");

  const label = action.text ? `\n\n[OK = ${action.text}]` : "";
  if (win.confirm?.(body + label)) {
    void action.onPress?.();
  } else {
    void cancel?.onPress?.();
  }
}
