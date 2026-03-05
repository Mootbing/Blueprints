import React, { useState, useRef } from "react";
import { View, Pressable, Text, StyleSheet, Animated } from "react-native";
import type { Component, Screen } from "../../types";
import { TreeView } from "./TreeView";
import { JsonEditorView } from "./JsonEditorView";

type TabMode = "tree" | "json";

interface LayersPageProps {
  width: number;
  screen: Screen;
  components: Component[];
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onScreenUpdate: (screen: Screen) => void;
}

export function LayersPage({
  width,
  screen,
  components,
  onSelectComponent,
  onDeleteComponent,
  onScreenUpdate,
}: LayersPageProps) {
  const [mode, setMode] = useState<TabMode>("tree");
  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchTo = (tab: TabMode) => {
    setMode(tab);
    Animated.timing(slideAnim, {
      toValue: tab === "tree" ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const highlightLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "50%"],
  });

  return (
    <View style={[styles.page, { width }]}>
      {/* Segmented toggle */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentTrack}>
          <Animated.View
            style={[styles.segmentHighlight, { left: highlightLeft, width: "50%" }]}
          />
          <Pressable style={styles.segmentBtn} onPress={() => switchTo("tree")}>
            <Text style={[styles.segmentText, mode === "tree" && styles.segmentTextActive]}>
              Tree View
            </Text>
          </Pressable>
          <Pressable style={styles.segmentBtn} onPress={() => switchTo("json")}>
            <Text style={[styles.segmentText, mode === "json" && styles.segmentTextActive]}>
              JSON
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {mode === "tree" ? (
        <TreeView
          components={components}
          onSelectComponent={onSelectComponent}
          onDeleteComponent={onDeleteComponent}
        />
      ) : (
        <JsonEditorView screen={screen} onScreenUpdate={onScreenUpdate} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 8,
  },
  segmentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  segmentTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    height: 36,
  },
  segmentHighlight: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  segmentBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  segmentText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
});
