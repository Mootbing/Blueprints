import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import type { Component } from "../types";

interface GroupBreadcrumbProps {
  drillPath: string[];
  components: Component[];
  onDrillToLevel: (level: number) => void;
}

function findComponentName(components: Component[], id: string): string {
  for (const c of components) {
    if (c.id === id) {
      if (c.type === "text") return c.content?.slice(0, 12) || "Text";
      if (c.type === "button") return c.label?.slice(0, 12) || "Button";
      return "Group";
    }
    if (c.type === "container" && c.children) {
      const found = findComponentName(c.children, id);
      if (found) return found;
    }
  }
  return "Group";
}

export function GroupBreadcrumb({ drillPath, components, onDrillToLevel }: GroupBreadcrumbProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => onDrillToLevel(0)}>
        <Text style={styles.segment}>Canvas</Text>
      </Pressable>
      {drillPath.map((id, index) => {
        const name = findComponentName(components, id);
        const isLast = index === drillPath.length - 1;
        return (
          <React.Fragment key={id}>
            <Text style={styles.separator}>{" > "}</Text>
            <Pressable onPress={() => onDrillToLevel(index + 1)} disabled={isLast}>
              <Text style={[styles.segment, isLast && styles.segmentCurrent]}>{name}</Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 90,
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  segment: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  segmentCurrent: {
    color: "#fff",
  },
  separator: {
    color: "#333",
    fontSize: 13,
  },
});
