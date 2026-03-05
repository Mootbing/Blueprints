import React from "react";
import { View, Pressable, Text, StyleSheet, Platform, Alert } from "react-native";

interface SettingsPageProps {
  width: number;
  isEditMode: boolean;
  snappingEnabled: boolean;
  inspectorEnabled: boolean;
  quickToggleEnabled: boolean;
  onToggleEditMode: () => void;
  onToggleSnapping: () => void;
  onToggleInspector: () => void;
  onToggleQuickToggle: () => void;
  onCloseBlueprint: () => void;
  onDeleteBlueprint: () => void;
  onClose: () => void;
}

export function SettingsPage({
  width,
  isEditMode,
  snappingEnabled,
  inspectorEnabled,
  quickToggleEnabled,
  onToggleEditMode,
  onToggleSnapping,
  onToggleInspector,
  onToggleQuickToggle,
  onCloseBlueprint,
  onDeleteBlueprint,
  onClose,
}: SettingsPageProps) {

  const handleClose = () => {
    onClose();
    onCloseBlueprint();
  };

  const handleDelete = () => {
    onClose();
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Delete Blueprint?\n\nThis will permanently delete this blueprint. This cannot be undone."
        )
      ) {
        onDeleteBlueprint();
      }
    } else {
      Alert.alert(
        "Delete Blueprint",
        "This will permanently delete this blueprint. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDeleteBlueprint },
        ]
      );
    }
  };

  return (
    <View style={[styles.page, { width }]}>
      {/* Preview Mode */}
      <Text style={styles.categoryHeader}>MODE</Text>
      <Pressable style={styles.row} onPress={onToggleEditMode}>
        <Text style={styles.rowLabel}>Preview Mode</Text>
        <View style={[styles.toggleTrack, !isEditMode && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, !isEditMode && styles.toggleThumbOn]} />
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

      <Pressable style={styles.row} onPress={onToggleQuickToggle}>
        <Text style={styles.rowLabel}>Quick Preview / Edit</Text>
        <View style={[styles.toggleTrack, quickToggleEnabled && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, quickToggleEnabled && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/* Blueprint */}
      <Text style={styles.categoryHeader}>BLUEPRINT</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.projectRow, pressed && styles.projectRowPressed]}
        onPress={handleClose}
      >
        <Text style={styles.projectLabel}>Close Blueprint</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Danger Zone */}
      <Text style={[styles.categoryHeader, styles.dangerHeader]}>DANGER ZONE</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.dangerRow, pressed && styles.dangerRowPressed]}
        onPress={handleDelete}
      >
        <Text style={styles.dangerLabel}>Delete Blueprint</Text>
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
  projectRow: {
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  projectRowPressed: {
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  projectLabel: {
    color: "#a5b4fc",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
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
