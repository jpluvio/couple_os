import { View, Text, Pressable } from "react-native";
import type { CheckIn } from "@/types/database";
import { getCheckInStatus, type CheckInStatus } from "@/hooks/useCheckins";
import { PERIOD_LABELS, relativeTime } from "./checkinShared";

// Configurazione visiva per ogni stato del check-in
const STATUS_CONFIG: Record<CheckInStatus, { label: string; emoji: string; classes: string }> = {
  waiting_you: {
    label: "Tocca a te",
    emoji: "✏️",
    classes: "bg-blue-50 text-blue-600",
  },
  waiting_partner: {
    label: "In attesa del partner",
    emoji: "⏳",
    classes: "bg-amber-50 text-amber-600",
  },
  revealed: {
    label: "Rivelato",
    emoji: "✨",
    classes: "bg-green-50 text-green-600",
  },
};

interface CheckinCardProps {
  checkin: CheckIn;
  currentUserId: string;
  onPress: () => void;
}

export function CheckinCard({ checkin, currentUserId, onPress }: CheckinCardProps) {
  const status = getCheckInStatus(checkin, currentUserId);
  const config = STATUS_CONFIG[status];

  return (
    <Pressable
      onPress={onPress}
      className="bg-white mx-4 mb-3 rounded-2xl p-4"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Header: periodo + tempo */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {PERIOD_LABELS[checkin.period_type]}
        </Text>
        <Text className="text-xs text-gray-400">{relativeTime(checkin.created_at)}</Text>
      </View>

      {/* Prompt */}
      <Text className="text-base font-semibold text-gray-900 leading-relaxed mb-3">
        {checkin.prompt}
      </Text>

      {/* Stato */}
      <View className="flex-row">
        <View className={`flex-row items-center px-2.5 py-1 rounded-full ${config.classes.split(" ")[0]}`}>
          <Text className="text-sm mr-1">{config.emoji}</Text>
          <Text className={`text-xs font-semibold ${config.classes.split(" ")[1]}`}>
            {config.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
