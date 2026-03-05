import React, { useState, useCallback } from "react";
import { View, TextInput, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from "react-native";
import type { Screen } from "../../types";
import { ScreenSchema } from "../../types";

interface JsonEditorViewProps {
  screen: Screen;
  onScreenUpdate: (screen: Screen) => void;
}

export function JsonEditorView({ screen, onScreenUpdate }: JsonEditorViewProps) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(screen, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  // Header ~56 + segmented toggle ~52 + padding ~24 + button ~46 + bottom safe ~50
  const inputMaxHeight = windowHeight - 230;

  const handleApply = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const validated = ScreenSchema.parse(parsed);
      onScreenUpdate(validated);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [jsonText, onScreenUpdate]);

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.jsonInput, { maxHeight: inputMaxHeight }]}
        value={jsonText}
        onChangeText={(text) => {
          setJsonText(text);
          setJsonError(null);
        }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        placeholder="Screen JSON..."
        placeholderTextColor="rgba(255,255,255,0.2)"
      />
      {jsonError && <Text style={styles.jsonError}>{jsonError}</Text>}
      <Pressable
        style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
        onPress={handleApply}
      >
        <Text style={styles.applyLabel}>Apply Changes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  jsonInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    minHeight: 200,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    color: "#e2e8f0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    padding: 12,
  },
  jsonError: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  applyBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center" as const,
    marginTop: 8,
  },
  applyBtnPressed: {
    backgroundColor: "#4f46e5",
  },
  applyLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
