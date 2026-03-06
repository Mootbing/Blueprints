import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Screen } from "../../types";
import { sharedMenuStyles } from "./sharedStyles";

interface ScreensPageProps {
  width: number;
  screens: Record<string, Screen>;
  currentScreenId: string;
  initialScreenId: string;
  onSwitchScreen: (id: string) => void;
  onAddScreen: () => void;
  onDeleteScreen: (id: string) => void;
  onRenameScreen: (id: string, name: string) => void;
  onSetInitialScreen: (id: string) => void;
  onClose: () => void;
}

export function ScreensPage({
  width,
  screens,
  currentScreenId,
  initialScreenId,
  onSwitchScreen,
  onAddScreen,
  onDeleteScreen,
  onRenameScreen,
  onSetInitialScreen,
  onClose,
}: ScreensPageProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const allScreens = Object.values(screens);
  const screenList = searchQuery.trim()
    ? allScreens.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allScreens;

  const startRename = (screen: Screen) => {
    setRenamingId(screen.id);
    setRenameText(screen.name);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      onRenameScreen(renamingId, renameText.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = (id: string) => {
    if (allScreens.length <= 1) {
      Alert.alert("Cannot delete", "You must have at least one screen.");
      return;
    }
    const screen = screens[id];
    Alert.alert(
      "Delete Screen",
      `Delete "${screen?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteScreen(id),
        },
      ]
    );
  };

  return (
    <View style={[styles.page, { width }]}>
      <Text style={styles.sectionHeader}>SCREENS</Text>

      <View style={styles.searchContainer}>
        <Feather name="search" size={14} color="rgba(255,255,255,0.35)" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search screens..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={14} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}
      </View>

      {screenList.map((screen) => {
        const isCurrent = screen.id === currentScreenId;
        const isInitial = screen.id === initialScreenId;
        const componentCount = screen.components.length;

        return (
          <Pressable
            key={screen.id}
            style={styles.screenRow}
            onPress={() => {
              onSwitchScreen(screen.id);
              onClose();
            }}
          >
            <View style={styles.screenInfo}>
              {renamingId === screen.id ? (
                <TextInput
                  style={styles.renameInput}
                  value={renameText}
                  onChangeText={setRenameText}
                  onBlur={commitRename}
                  onSubmitEditing={commitRename}
                  autoFocus
                  selectTextOnFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <Text style={styles.screenName}>{screen.name}</Text>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.screenMeta}>
                  {componentCount} component{componentCount !== 1 ? "s" : ""}
                </Text>
                {isInitial && (
                  <View style={styles.badgeInitial}>
                    <Text style={styles.badgeText}>Initial</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={styles.badgeCurrent}>
                    <Text style={styles.badgeText}>Current</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.iconBtn} onPress={() => startRename(screen)}>
                <Feather name="edit-2" size={14} color="rgba(255,255,255,0.5)" />
              </Pressable>
              {!isInitial && (
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => onSetInitialScreen(screen.id)}
                >
                  <Feather name="home" size={14} color="rgba(255,255,255,0.5)" />
                </Pressable>
              )}
              <Pressable
                style={[styles.iconBtn, allScreens.length <= 1 && styles.iconBtnDisabled]}
                onPress={() => handleDelete(screen.id)}
                disabled={allScreens.length <= 1}
              >
                <Feather
                  name="trash-2"
                  size={14}
                  color={allScreens.length <= 1 ? "rgba(255,255,255,0.15)" : "#fca5a5"}
                />
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      <Pressable style={styles.addBtn} onPress={onAddScreen}>
        <Text style={styles.addLabel}>+ Add Screen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 4 },
  sectionHeader: sharedMenuStyles.sectionHeader,
  screenRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  screenInfo: { flex: 1 },
  screenName: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  renameInput: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  screenMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
  },
  badgeInitial: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  badgeCurrent: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.25)",
  },
  badgeText: {
    color: "#c7d2fe",
    fontSize: 10,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  addBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.4)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addLabel: { color: "#818cf8", fontSize: 14, fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    padding: 0,
  },
});
