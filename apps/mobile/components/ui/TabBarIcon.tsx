import { Text } from "react-native";

interface TabBarIconProps {
  emoji: string;
  color: string;
}

export function TabBarIcon({ emoji }: TabBarIconProps) {
  return <Text className="text-2xl leading-none">{emoji}</Text>;
}
