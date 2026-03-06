import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SlateMeta } from "../types";

interface SyncStatusBadgeProps {
  syncStatus?: SlateMeta['syncStatus'];
  size?: number;
}

export function SyncStatusBadge({ syncStatus, size = 14 }: SyncStatusBadgeProps) {
  let iconName: keyof typeof Feather.glyphMap = "cloud";
  let color = "#333";

  switch (syncStatus) {
    case 'synced':
      iconName = "cloud";
      color = "#22c55e";
      break;
    case 'dirty':
      iconName = "upload-cloud";
      color = "#f59e0b";
      break;
    case 'conflict':
      iconName = "alert-triangle";
      color = "#dc2626";
      break;
    case 'local-only':
      iconName = "cloud-off";
      color = "#555";
      break;
    default:
      iconName = "cloud-off";
      color = "#333";
      break;
  }

  return (
    <View style={styles.container}>
      <Feather name={iconName} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
