import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Animated } from "react-native";
import type { Component } from "../../types";

const ICON_MAP: Record<string, string> = {
  text: "Aa",
  button: "[ ]",
  image: "IMG",
  textInput: "___",
  toggle: "ON",
  divider: "---",
  shape: "SHP",
  icon: "ICO",
  list: "LST",
  container: "BOX",
};

function getComponentLabel(comp: Component): string {
  let label = "";
  if ("content" in comp && typeof comp.content === "string") label = comp.content;
  else if ("label" in comp && typeof comp.label === "string") label = comp.label;
  else if ("placeholder" in comp && typeof comp.placeholder === "string") label = comp.placeholder;
  else if ("name" in comp && typeof comp.name === "string") label = comp.name;
  else label = comp.type;

  return label.length > 25 ? label.slice(0, 25) + "..." : label;
}

interface FlatNode {
  component: Component;
  depth: number;
}

function flattenTree(components: Component[], depth = 0): FlatNode[] {
  const result: FlatNode[] = [];
  for (const comp of components) {
    result.push({ component: comp, depth });
    if (comp.type === "container" && comp.children) {
      result.push(...flattenTree(comp.children, depth + 1));
    }
  }
  return result;
}

interface TreeViewProps {
  components: Component[];
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
}

function TreeRow({
  node,
  onSelect,
  onDelete,
}: {
  node: FlatNode;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });
    return (
      <Pressable
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete(node.component.id);
        }}
      >
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <Pressable
        style={({ pressed }) => [
          styles.treeRow,
          { paddingLeft: 16 + node.depth * 24 },
          pressed && styles.treeRowPressed,
        ]}
        onPress={() => onSelect(node.component.id)}
      >
        <Text style={styles.typeIcon}>{ICON_MAP[node.component.type] ?? "???"}</Text>
        <Text style={styles.label} numberOfLines={1}>
          {getComponentLabel(node.component)}
        </Text>
        <Text style={styles.typeTag}>{node.component.type}</Text>
      </Pressable>
    </Swipeable>
  );
}

export function TreeView({ components, onSelectComponent, onDeleteComponent }: TreeViewProps) {
  const nodes = flattenTree(components);

  if (nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No components on canvas</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {nodes.map((node) => (
        <TreeRow
          key={node.component.id}
          node={node}
          onSelect={onSelectComponent}
          onDelete={onDeleteComponent}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
  },
  treeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingRight: 16,
    gap: 10,
    backgroundColor: "transparent",
  },
  treeRowPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  typeIcon: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  label: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  typeTag: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  deleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  deleteText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
