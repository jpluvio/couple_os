import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0e82ea" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)/board" />;
  }

  return <Redirect href="/(auth)/login" />;
}
