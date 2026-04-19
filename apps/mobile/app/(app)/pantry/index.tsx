import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCouple } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { PantryTab } from "@/components/pantry/PantryTab";
import { ShoppingTab } from "@/components/pantry/ShoppingTab";
import { RecipesTab } from "@/components/pantry/RecipesTab";

type Tab = "pantry" | "shopping" | "recipes";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "pantry", label: "Dispensa", emoji: "🏠" },
  { key: "shopping", label: "Spesa", emoji: "🛍️" },
  { key: "recipes", label: "Ricette", emoji: "👨‍🍳" },
];

export default function PantryScreen() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const [activeTab, setActiveTab] = useState<Tab>("pantry");

  if (!user || !couple) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Cucina & Spesa</Text>
        <Text className="text-sm text-gray-500 mt-0.5">Dispensa, lista della spesa e ricette</Text>
      </View>

      {/* Tab selector */}
      <View className="flex-row mx-4 mb-3 bg-gray-100 rounded-2xl p-1">
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${
              activeTab === tab.key ? "bg-white" : ""
            }`}
            style={
              activeTab === tab.key
                ? { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2, gap: 4 }
                : { gap: 4 }
            }
          >
            <Text className="text-sm">{tab.emoji}</Text>
            <Text
              className={`text-sm font-semibold ${
                activeTab === tab.key ? "text-orange-500" : "text-gray-500"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "pantry" && <PantryTab />}
      {activeTab === "shopping" && <ShoppingTab />}
      {activeTab === "recipes" && <RecipesTab />}
    </SafeAreaView>
  );
}
