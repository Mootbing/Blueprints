import React from "react";
import { View, Pressable, Text, StyleSheet, Platform, Alert } from "react-native";

interface SettingsPageProps {
  width: number;
  isEditMode: boolean;
  snappingEnabled: boolean;
  inspectorEnabled: boolean;
  onToggleEditMode: () => void;
  onToggleSnapping: () => void;
  onToggleInspector: () => void;
  onResetProject: () => void;
  onClose: () => void;
}

export function SettingsPage({
  width,
  isEditMode,
  snappingEnabled,
  inspectorEnabled,
  onToggleEditMode,
  onToggleSnapping,
  onToggleInspector,
  onResetProject,
  onClose,
}: SettingsPageProps) {

  const handleReset = () => {
    onClose();
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Reset Project?\n\nThis will reset to the default landing page. This cannot be undone."
        )
      ) {
        onResetProject();
      }
    } else {
      Alert.alert(
        "Reset Project",
        "This will reset to the default landing page. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: onResetProject },
        ]
      );
    }
  };

  return (
    <View style={[styles.page, { width }]}>
      {/* Edit Mode */}
      <Text style={styles.categoryHeader}>MODE</Text>
      <Pressable style={styles.row} onPress={onToggleEditMode}>
        <Text style={styles.rowLabel}>Edit Mode</Text>
        <View style={[styles.toggleTrack, isEditMode && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, isEditMode && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      {isEditMode && (
        <Pressable style={styles.row} onPress={onToggleSnapping}>
          <Text style={styles.rowLabel}>Snap to Guides</Text>
          <View style={[styles.toggleTrack, snappingEnabled && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, snappingEnabled && styles.toggleThumbOn]} />
          </View>
        </Pressable>
      )}

      <Pressable style={styles.row} onPress={onToggleInspector}>
        <Text style={styles.rowLabel}>Component Inspector</Text>
        <View style={[styles.toggleTrack, inspectorEnabled && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, inspectorEnabled && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/* Danger Zone */}
      <Text style={[styles.categoryHeader, styles.dangerHeader]}>DANGER ZONE</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.dangerRow, pressed && styles.dangerRowPressed]}
        onPress={handleReset}
      >
        <Text style={styles.dangerLabel}>Reset Project</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 4,
  },
  categoryHeader: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleTrackOn: {
    backgroundColor: "#6366f1",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  dangerHeader: {
    color: "rgba(239,68,68,0.6)",
  },
  dangerRow: {
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  dangerRowPressed: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  dangerLabel: {
    color: "#fca5a5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
});
