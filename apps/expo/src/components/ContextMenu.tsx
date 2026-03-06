import React from "react";
import { View, Pressable, Text, StyleSheet, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";

interface ContextMenuProps {
  x: number;
  y: number;
  hasClipboard: boolean;
  hasComponent: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onAIChat?: () => void;
  onClose: () => void;
}

const MENU_WIDTH = 160;
const ITEM_HEIGHT = 42;

export function ContextMenu({
  x,
  y,
  hasClipboard,
  hasComponent,
  onCopy,
  onPaste,
  onDuplicate,
  onAIChat,
  onClose,
}: ContextMenuProps) {
  const { width: screenW } = Dimensions.get("window");

  const itemCount = hasComponent ? (onAIChat ? 4 : 3) : 1;
  const menuHeight = itemCount * ITEM_HEIGHT + (itemCount - 1) * StyleSheet.hairlineWidth;

  // Adjust position to stay within screen bounds
  let left = x - MENU_WIDTH / 2;
  let top = y - menuHeight - 12;
  if (left < 8) left = 8;
  if (left + MENU_WIDTH > screenW - 8) left = screenW - MENU_WIDTH - 8;
  if (top < 8) top = y + 12; // Show below if no room above

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.menu, { left, top }]}>
        {hasComponent && (
          <>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={onCopy}
            >
              <Feather name="copy" size={18} color="#ccc" />
              <Text style={styles.menuLabel}>Copy</Text>
            </Pressable>
            <View style={styles.divider} />
          </>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            !hasClipboard && styles.menuItemDisabled,
            pressed && hasClipboard && styles.menuItemPressed,
          ]}
          onPress={hasClipboard ? onPaste : undefined}
          disabled={!hasClipboard}
        >
          <Feather
            name="clipboard"
            size={18}
            color={hasClipboard ? "#ccc" : "#333"}
          />
          <Text
            style={[
              styles.menuLabel,
              !hasClipboard && styles.menuLabelDisabled,
            ]}
          >
            Paste
          </Text>
        </Pressable>
        {hasComponent && (
          <>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={onDuplicate}
            >
              <Feather name="layers" size={18} color="#ccc" />
              <Text style={styles.menuLabel}>Duplicate</Text>
            </Pressable>
          </>
        )}
        {hasComponent && onAIChat && (
          <>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={onAIChat}
            >
              <Feather name="zap" size={18} color="#fff" />
              <Text style={[styles.menuLabel, { color: "#fff" }]}>Change with AI</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    width: MENU_WIDTH,
    backgroundColor: "rgba(0,0,0,0.95)",
    borderRadius: 12,
    zIndex: 1001,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: "#111",
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuLabel: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  menuLabelDisabled: {
    color: "#333",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 12,
  },
});
