import { useState } from "react";
import { useCouple } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { Screen, Header, Tabs } from "@/components/kit";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { PantryTab } from "@/components/pantry/PantryTab";
import { ShoppingTab } from "@/components/pantry/ShoppingTab";
import { RecipesTab } from "@/components/pantry/RecipesTab";

type Sezione = "pantry" | "shopping" | "recipes";

const SEZIONI: { key: Sezione; label: string }[] = [
  { key: "pantry", label: "Dispensa" },
  { key: "shopping", label: "Spesa" },
  { key: "recipes", label: "Ricette" },
];

export default function CasaScreen() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const [sezione, setSezione] = useState<Sezione>("pantry");

  if (!user || !couple) return null;

  return (
    <Screen>
      <Header title="Casa" right={<NotificationBell />} />
      <Tabs value={sezione} onChange={setSezione} options={SEZIONI} />
      {sezione === "pantry" && <PantryTab />}
      {sezione === "shopping" && <ShoppingTab />}
      {sezione === "recipes" && <RecipesTab />}
    </Screen>
  );
}
