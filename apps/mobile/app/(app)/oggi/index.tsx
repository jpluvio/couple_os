import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { Screen, Header, Card, Label, Icon, Avatar } from "@/components/kit";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { SkeletonCardList } from "@/components/ui/Skeleton";

const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
              "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** Chiave "AAAA-MM-GG" locale: `toISOString()` sposterebbe il giorno a est di UTC. */
function oggiISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Voce = { id: string; titolo: string; sotto: string; urgente: boolean };

export default function OggiScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const coupleId = couple?.id ?? "";
  const giorno = oggiISO();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["oggi", coupleId, giorno],
    enabled: !!coupleId,
    queryFn: async () => {
      const fineGiornata = `${giorno}T23:59:59`;

      const [eventi, todo, dispensa] = await Promise.all([
        supabase.from("events").select("id, title, start_at, all_day")
          .eq("couple_id", coupleId)
          .gte("start_at", `${giorno}T00:00:00`).lte("start_at", fineGiornata)
          .order("start_at"),
        supabase.from("todo_items").select("id, title, deadline, status, list_id")
          .neq("status", "DONE").not("deadline", "is", null).lte("deadline", fineGiornata)
          .order("deadline").limit(5),
        supabase.from("pantry_items").select("id, name, expires_at")
          .eq("couple_id", coupleId).not("expires_at", "is", null)
          .lte("expires_at", giorno).limit(5),
      ]);

      return {
        eventi: eventi.data ?? [],
        todo: todo.data ?? [],
        scaduti: dispensa.data ?? [],
      };
    },
  });

  const voci = useMemo<Voce[]>(() => {
    if (!data) return [];
    const out: Voce[] = [];

    for (const e of data.eventi) {
      const ora = e.all_day
        ? "Tutto il giorno"
        : new Date(e.start_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      out.push({ id: `e-${e.id}`, titolo: e.title, sotto: ora, urgente: false });
    }
    for (const t of data.todo) {
      out.push({ id: `t-${t.id}`, titolo: t.title, sotto: "Scade oggi", urgente: true });
    }
    if (data.scaduti.length > 0) {
      const nomi = data.scaduti.map((p) => p.name).join(", ");
      out.push({
        id: "scadenze",
        titolo: data.scaduti.length === 1 ? "1 prodotto scaduto" : `${data.scaduti.length} prodotti scaduti`,
        sotto: nomi,
        urgente: true,
      });
    }
    return out;
  }, [data]);

  if (!user || !couple) return null;

  const oggi = new Date();
  const nomi = [user.name, partner?.name].filter(Boolean).join(" e ");

  return (
    <Screen>
      <Header
        kicker={`${GIORNI[oggi.getDay()]} ${oggi.getDate()} ${MESI[oggi.getMonth()]}`}
        title={nomi ? `Buongiorno,\n${nomi}` : "Buongiorno"}
        right={<NotificationBell />}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#a8562e" />}
      >
        {isLoading && !data ? (
          <SkeletonCardList count={2} />
        ) : (
          <Card>
            <Label>Oggi</Label>
            {voci.length === 0 ? (
              <Text className="mt-3 text-[14.5px] text-muted">
                Niente in programma. Giornata libera.
              </Text>
            ) : (
              <View className="mt-3" style={{ gap: 13 }}>
                {voci.map((v) => (
                  <View key={v.id} className="flex-row items-stretch" style={{ gap: 12 }}>
                    <View
                      className="w-[3px] flex-shrink-0"
                      style={{ backgroundColor: v.urgente ? "#a8562e" : "#d8cfc2" }}
                    />
                    <View style={{ gap: 1 }}>
                      <Text className="text-[15px] font-medium text-ink">{v.titolo}</Text>
                      <Text className="text-[13px] text-muted" numberOfLines={1}>{v.sotto}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        <View className="mx-6 mb-3 flex-row" style={{ gap: 12 }}>
          <Scorciatoia
            icona="board"
            titolo="Bacheca"
            onPress={() => router.push("/(app)/board")}
          />
          <Scorciatoia
            icona="check"
            titolo="Da fare"
            onPress={() => router.push("/(app)/todo")}
          />
        </View>

        <Pressable
          onPress={() => router.push("/(app)/checkin")}
          className="mx-6 flex-row items-center justify-between rounded-card bg-tint px-4 py-4"
          style={{ gap: 12 }}
        >
          <View style={{ gap: 3 }}>
            <Text className="text-[14px] font-semibold text-ink">Check-in della settimana</Text>
            <Text className="text-[13px] text-[#7a6f64]">Come state, voi due?</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {partner ? <Avatar name={partner.name} color="#4a6b63" size={26} /> : null}
            <Icon name="chevronDown" size={18} color="#8a7f74" />
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Scorciatoia({
  icona, titolo, onPress,
}: { icona: "board" | "check"; titolo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-card border border-line bg-card px-4 py-4"
      style={{ gap: 10 }}
    >
      <Icon name={icona} size={20} color="#a8562e" />
      <Text className="text-[14px] font-semibold text-ink">{titolo}</Text>
    </Pressable>
  );
}
