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

  const showUndoBar = onUndo != null || onRedo != null;

  // Build items list based on context
  const items: Array<{ key: string; icon: React.ReactNode; label: string; color?: string; disabled?: boolean; onPress?: () => void }> = [];

  if (hasComponent) {
    items.push({ key: "copy", icon: <Feather name="copy" size={18} color="#ccc" />, label: "Copy", onPress: onCopy });
    items.push({ key: "paste", icon: <Feather name="clipboard" size={18} color={hasClipboard ? "#ccc" : "#333"} />, label: "Paste", disabled: !hasClipboard, onPress: hasClipboard ? onPaste : undefined });
    items.push({ key: "duplicate", icon: <Feather name="layers" size={18} color="#ccc" />, label: "Duplicate", onPress: onDuplicate });
    if (onAIChat) {
      items.push({ key: "ai", icon: <MaterialCommunityIcons name="creation" size={20} color="#f5c542" />, label: "Change with AI", color: "#f5c542", onPress: onAIChat });
    }
  } else {
    items.push({ key: "paste", icon: <Feather name="clipboard" size={18} color={hasClipboard ? "#ccc" : "#333"} />, label: "Paste", disabled: !hasClipboard, onPress: hasClipboard ? onPaste : undefined });
  }


  const UNDO_BAR_HEIGHT = 44;
  const UNDO_BAR_GAP = 6;
  const menuHeight = items.length * ITEM_HEIGHT + (items.length - 1) * StyleSheet.hairlineWidth;
  const totalHeight = menuHeight + (showUndoBar ? UNDO_BAR_HEIGHT + UNDO_BAR_GAP : 0);

  // Adjust position to stay within screen bounds
  let left = x - MENU_WIDTH / 2;
  let top = y - totalHeight - 12;
  if (left < 8) left = 8;
  if (left + MENU_WIDTH > screenW - 8) left = screenW - MENU_WIDTH - 8;
  if (top < 8) top = y + 12; // Show below if no room above

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ position: "absolute", left, top, zIndex: 1001, alignItems: "center" }}>
        {showUndoBar && (
          <View style={styles.undoBar}>
            {onUndo != null && (
              <Pressable
                style={({ pressed }) => [styles.undoBtn, !canUndo && styles.menuItemDisabled, pressed && canUndo && styles.menuItemPressed]}
                onPress={canUndo ? onUndo : undefined}
                disabled={!canUndo}
              >
                <Feather name="corner-up-left" size={20} color={canUndo ? "#ccc" : "#555"} />
              </Pressable>
            )}
            {onUndo != null && onRedo != null && <View style={styles.undoDivider} />}
            {onRedo != null && (
              <Pressable
                style={({ pressed }) => [styles.undoBtn, !canRedo && styles.menuItemDisabled, pressed && canRedo && styles.menuItemPressed]}
                onPress={canRedo ? onRedo : undefined}
                disabled={!canRedo}
              >
                <Feather name="corner-up-right" size={20} color={canRedo ? "#ccc" : "#555"} />
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.menu}>
          {items.map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  item.disabled && styles.menuItemDisabled,
                  pressed && !item.disabled && styles.menuItemPressed,
                ]}
                onPress={item.onPress}
                disabled={item.disabled}
              >
                {item.icon}
                <Text style={[styles.menuLabel, item.disabled && styles.menuLabelDisabled, item.color ? { color: item.color } : null]}>{item.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
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
