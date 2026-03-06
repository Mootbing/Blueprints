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
  onClose,
}: ContextMenuProps) {
  const { width: screenW } = Dimensions.get("window");

  const itemCount = hasComponent ? 3 : 1;
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
              <Feather name="copy" size={18} color="#e2e8f0" />
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
            color={hasClipboard ? "#e2e8f0" : "rgba(255,255,255,0.2)"}
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
              <Feather name="layers" size={18} color="#e2e8f0" />
              <Text style={styles.menuLabel}>Duplicate</Text>
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
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: 12,
    zIndex: 1001,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuLabel: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "500",
  },
  menuLabelDisabled: {
    color: "rgba(255,255,255,0.2)",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 12,
  },
});
