import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Screen } from "../types";

interface ScreenTabBarProps {
  screens: Record<string, Screen>;
  currentScreenId: string;
  initialScreenId: string;
  onSwitchScreen: (id: string) => void;
  onAddScreen: () => void;
  onDeleteScreen: (id: string) => void;
  onRenameScreen: (id: string, name: string) => void;
  onSetInitialScreen: (id: string) => void;
}

export function ScreenTabBar({
  screens,
  currentScreenId,
  initialScreenId,
  onSwitchScreen,
  onAddScreen,
  onDeleteScreen,
  onRenameScreen,
  onSetInitialScreen,
}: ScreenTabBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const screenList = Object.values(screens);

  const handleLongPress = (id: string) => {
    const screen = screens[id];
    if (!screen) return;
    Alert.alert(screen.name, undefined, [
      {
        text: "Rename",
        onPress: () => {
          setRenamingId(id);
          setRenameText(screen.name);
        },
      },
      {
        text: id === initialScreenId ? "Initial Screen" : "Set as Initial",
        onPress: () => onSetInitialScreen(id),
        style: id === initialScreenId ? "destructive" : "default",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (screenList.length <= 1) {
            Alert.alert("Cannot delete", "You must have at least one screen.");
            return;
          }
          onDeleteScreen(id);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      onRenameScreen(renamingId, renameText.trim());
    }
    setRenamingId(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {screenList.map((screen) => {
          const isActive = screen.id === currentScreenId;
          const isInitial = screen.id === initialScreenId;

          if (renamingId === screen.id) {
            return (
              <View key={screen.id} style={[styles.pill, styles.pillActive]}>
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
              </View>
            );
          }

          return (
            <Pressable
              key={screen.id}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSwitchScreen(screen.id)}
              onLongPress={() => handleLongPress(screen.id)}
            >
              {isInitial && (
                <Feather
                  name="home"
                  size={11}
                  color={isActive ? "#ffffff" : "rgba(255,255,255,0.5)"}
                  style={styles.homeIcon}
                />
              )}
              <Text
                style={[styles.pillText, isActive && styles.pillTextActive]}
                numberOfLines={1}
              >
                {screen.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.addPill} onPress={onAddScreen}>
          <Feather name="plus" size={14} color="#818cf8" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    zIndex: 80,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pillActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  pillText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 100,
  },
  pillTextActive: {
    color: "#ffffff",
  },
  homeIcon: {
    marginRight: 4,
  },
  addPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.4)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  renameInput: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    minWidth: 60,
    paddingVertical: 0,
  },
});
