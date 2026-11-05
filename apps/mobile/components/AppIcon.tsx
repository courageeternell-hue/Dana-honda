import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  active?: boolean;
};

export function AppIcon({ name, size = 22, color = "#E60012", active = false }: Props) {
  const tileSize = Math.max(36, size + 16);
  return (
    <View
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: Math.round(tileSize * 0.34),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#E60012" : "#FFF0F1",
        borderWidth: 1,
        borderColor: active ? "#E60012" : "#F9D7DA",
      }}
    >
      <Ionicons name={name} size={size} color={active ? "#FFFFFF" : color} />
      <View
        style={{
          position: "absolute",
          right: 5,
          top: 5,
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: active ? "#FFFFFF" : "#E60012",
        }}
      />
    </View>
  );
}
