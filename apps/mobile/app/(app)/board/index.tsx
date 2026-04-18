import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BoardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center">
        <Text className="text-4xl mb-3">📋</Text>
        <Text className="text-xl font-bold text-gray-800">Board</Text>
        <Text className="text-sm text-gray-400 mt-1">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
