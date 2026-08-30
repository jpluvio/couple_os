import { View, Text, Pressable, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export { Icon };
export type { IconName };

/** Sfondo e struttura comuni a ogni schermata. */
export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView className="flex-1 bg-paper">{children}</SafeAreaView>;
}

/**
 * Intestazione editoriale: occhiello maiuscoletto sopra, titolo serif sotto.
 * È l'elemento che dà il tono a tutta l'app, quindi vive in un posto solo.
 */
export function Header({
  kicker,
  title,
  right,
}: {
  kicker?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-start justify-between px-6 pt-2 pb-4" style={{ gap: 12 }}>
      <View className="flex-1" style={{ gap: 3 }}>
        {kicker ? (
          <Text className="text-[13px] uppercase text-muted" style={{ letterSpacing: 1 }}>
            {kicker}
          </Text>
        ) : null}
        <Text className="font-display text-[32px] leading-[36px] text-ink">{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Etichetta di sezione, terracotta e maiuscoletta. */
export function Label({ children }: { children: ReactNode }) {
  return (
    <Text className="text-[11px] uppercase text-accent" style={{ letterSpacing: 1.1 }}>
      {children}
    </Text>
  );
}

/** Scheda: bordo invece di ombra, angoli netti. */
export function Card({ children, style, className = "" }: ViewProps & { className?: string }) {
  return (
    <View className={`mx-6 mb-3 rounded-card border border-line bg-card px-5 py-4 ${className}`} style={style}>
      {children}
    </View>
  );
}

/** Riquadro con fondo tinto: avvisi e richiami, non allarmi. */
export function Notice({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <View className="mx-6 mb-3 flex-row items-center rounded-card bg-tint px-4 py-3" style={{ gap: 11 }}>
      {icon ? <Icon name={icon} size={17} color="#a8562e" /> : null}
      <Text className="flex-1 text-[13.5px] text-[#6d6259]">{children}</Text>
    </View>
  );
}

/** Linguette di sezione (Dispensa / Spesa / Ricette, Spese / Analisi / …). */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
}) {
  return (
    <View className="mx-6 mb-4 flex-row" style={{ gap: 7 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`rounded-pill px-4 py-2 ${on ? "bg-ink" : "border border-line bg-card"}`}
          >
            <Text className={`text-[13px] ${on ? "font-semibold text-paper" : "text-muted"}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Azione principale. Un solo stile, così non se ne inventano altri. */
export function Button({
  label,
  onPress,
  icon,
  tone = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: "primary" | "done" | "quiet";
  disabled?: boolean;
}) {
  const bg = disabled ? "bg-[#c7bdb1]" : tone === "done" ? "bg-ok" : tone === "quiet" ? "bg-card border border-line" : "bg-ink";
  const fg = tone === "quiet" ? "#1a1714" : "#faf7f2";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`flex-row items-center justify-center rounded-pill py-3.5 ${bg}`}
      style={{ gap: 9 }}
    >
      {icon ? <Icon name={icon} size={17} color={fg} width={1.7} /> : null}
      <Text className="text-[14.5px] font-semibold" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Pastiglia di stato: scadenze, "in dispensa", conteggi. */
export function Badge({ text, color = "#8a7f74" }: { text: string; color?: string }) {
  return (
    <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: color + "18" }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

/** Iniziale colorata del partner. */
export function Avatar({ name, color, size = 30 }: { name?: string | null; color: string; size?: number }) {
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {(name ?? "?").trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** Vuoto: mai una schermata bianca senza spiegazione. */
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center px-8 py-20">
      <Text className="text-center font-display text-[20px] text-ink">{title}</Text>
      {hint ? <Text className="mt-2 text-center text-[13.5px] text-soft">{hint}</Text> : null}
    </View>
  );
}
