import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-card">
        <ActivityIndicator size="large" color="#a8562e" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)/oggi" />;
  }

  return <Redirect href="/(auth)/login" />;
}
