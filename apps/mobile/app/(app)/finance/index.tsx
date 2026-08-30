import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCouple } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { ExpensesTab } from "@/components/finance/ExpensesTab";
import { BudgetTab } from "@/components/finance/BudgetTab";
import { GoalsTab } from "@/components/finance/GoalsTab";
import { StatsTab } from "@/components/finance/StatsTab";

type Tab = "expenses" | "stats" | "budget" | "goals";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "expenses", label: "Spese", emoji: "💸" },
  { key: "stats", label: "Analisi", emoji: "📈" },
  { key: "budget", label: "Budget", emoji: "📊" },
  { key: "goals", label: "Obiettivi", emoji: "🎯" },
];

const now = new Date();
const MONTH_LABEL = now.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

export default function FinanceScreen() {
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");

  if (!user || !couple) return null;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* Header */}
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-ink">Finanze</Text>
        <Text className="text-sm text-muted mt-0.5 capitalize">{MONTH_LABEL}</Text>
      </View>

      {/* Tab selector */}
      <View className="flex-row mx-4 mb-3 bg-hair rounded-card p-1">
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-card ${
              activeTab === tab.key ? "bg-card" : ""
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
                activeTab === tab.key ? "text-accent" : "text-muted"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "expenses" && (
        <ExpensesTab
          partnerName={partner?.name ?? null}
          partnerSalary={partner?.salary ?? null}
        />
      )}
      {activeTab === "stats" && <StatsTab />}
      {activeTab === "budget" && <BudgetTab />}
      {activeTab === "goals" && <GoalsTab />}
    </SafeAreaView>
  );
}
