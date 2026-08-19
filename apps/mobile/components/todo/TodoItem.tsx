import { View, Text, Pressable, Alert } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PriorityLevel, TodoStatus } from "@/types/database";

export type TodoItemType = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: PriorityLevel;
  status: TodoStatus;
  assignee_id: string | null;
  list_id: string;
  created_at: string;
  assignee?: { name: string | null } | null;
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

interface TodoItemProps {
  item: TodoItemType;
  currentUserId: string;
  queryKey: unknown[];
}

export function TodoItem({ item, currentUserId, queryKey }: TodoItemProps) {
  const queryClient = useQueryClient();
  const isDone = item.status === "DONE";
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  async function toggleDone() {
    scale.value = withTiming(0.92, { duration: 80 }, () => {
      scale.value = withTiming(1, { duration: 80 });
    });

    const newStatus: TodoStatus = isDone ? "TODO" : "DONE";

    // Optimistic update
    queryClient.setQueryData(queryKey, (old: TodoItemType[] | undefined) =>
      old?.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    await supabase.from("todo_items").update({ status: newStatus }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey });
  }

  function handleLongPress() {
    Alert.alert(item.title, undefined, [
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("todo_items").delete().eq("id", item.id);
          queryClient.invalidateQueries({ queryKey });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const isOverdue = item.deadline && !isDone && new Date(item.deadline) < new Date();

  return (
    <Pressable onLongPress={handleLongPress} onPress={toggleDone}>
      <Animated.View
        style={animStyle}
        className={`bg-white mx-4 mb-2 rounded-xl px-4 py-3 flex-row items-center ${isDone ? "opacity-50" : ""}`}
      >
        {/* Checkbox */}
        <View
          className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
            isDone ? "bg-green-500 border-green-500" : "border-gray-300"
          }`}
        >
          {isDone && <Text className="text-white text-xs font-bold">✓</Text>}
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
            {item.title}
          </Text>
          <View className="flex-row items-center mt-0.5" style={{ gap: 8 }}>
            <View className="flex-row items-center" style={{ gap: 3 }}>
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[item.priority] }} />
              <Text className="text-xs text-gray-400">{PRIORITY_LABELS[item.priority]}</Text>
            </View>
            {item.deadline && (
              <Text className={`text-xs font-medium ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                {formatDeadline(item.deadline)}
              </Text>
            )}
            {item.assignee?.name && (
              <Text className="text-xs text-gray-400">@{item.assignee.name.split(" ")[0]}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
