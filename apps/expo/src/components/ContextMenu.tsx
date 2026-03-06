import React from "react";
import { View, Pressable, Text, StyleSheet, Dimensions } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

interface ContextMenuProps {
  x: number;
  y: number;
  hasClipboard: boolean;
  hasComponent: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onAIChat?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClose,
}: ContextMenuProps) {
  const { width: screenW } = Dimensions.get("window");

  const hasUndoRedo = onUndo != null || onRedo != null;
  let itemCount = hasComponent ? (onAIChat ? 4 : 3) : 1;
  const menuHeight = itemCount * ITEM_HEIGHT + (itemCount - 1) * StyleSheet.hairlineWidth;
  const UNDO_BAR_HEIGHT = 44;
  const totalHeight = menuHeight + (hasUndoRedo ? UNDO_BAR_HEIGHT + 6 : 0);

  // Adjust position to stay within screen bounds
  let left = x - MENU_WIDTH / 2;
  let top = y - totalHeight - 12;
  if (left < 8) left = 8;
  if (left + MENU_WIDTH > screenW - 8) left = screenW - MENU_WIDTH - 8;
  if (top < 8) top = y + 12; // Show below if no room above

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ position: "absolute", left, top, zIndex: 1001 }}>
        {hasUndoRedo && (
          <View style={styles.undoBar}>
            <Pressable
              style={({ pressed }) => [
                styles.undoBtn,
                !canUndo && styles.menuItemDisabled,
                pressed && canUndo && styles.menuItemPressed,
              ]}
              onPress={canUndo ? onUndo : undefined}
              disabled={!canUndo}
            >
              <Feather name="corner-up-left" size={20} color={canUndo ? "#ccc" : "#444"} />
            </Pressable>
            <View style={styles.undoDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.undoBtn,
                !canRedo && styles.menuItemDisabled,
                pressed && canRedo && styles.menuItemPressed,
              ]}
              onPress={canRedo ? onRedo : undefined}
              disabled={!canRedo}
            >
              <Feather name="corner-up-right" size={20} color={canRedo ? "#ccc" : "#444"} />
            </Pressable>
          </View>
        )}
        <View style={styles.menu}>
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
                <MaterialCommunityIcons name="creation" size={20} color="#f5c542" />
                <Text style={[styles.menuLabel, { color: "#f5c542" }]}>Change with AI</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  undoBar: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.95)",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    marginBottom: 6,
  },
  undoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  undoDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginVertical: 8,
  },
  menu: {
    width: MENU_WIDTH,
    backgroundColor: "rgba(0,0,0,0.95)",
    borderRadius: 12,
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
