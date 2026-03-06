import React, { useState, useCallback, useEffect } from "react";
import { View, Pressable, Text, TextInput, StyleSheet, Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSlate, Theme } from "../../types";
import { sharedMenuStyles } from "./sharedStyles";
import { ColorPickerModal } from "../ColorPickerModal";

const DEFAULT_COLORS = {
  primary: "#ffffff",
  secondary: "#cccccc",
  error: "#dc2626",
  success: "#22c55e",
  warning: "#f59e0b",
};

const DEFAULT_BG_COLORS = {
  background: "#000000",
  secondaryBackground: "#1a1a1a",
};

const DEFAULT_BORDER_RADII = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 };

const DEFAULT_SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

const DEFAULT_FONT_SIZES = { xs: 10, sm: 12, base: 14, md: 16, lg: 20, xl: 24, xxl: 32 };

const COLOR_FIELDS = [
  { key: "primary" as const, label: "Primary" },
  { key: "secondary" as const, label: "Secondary" },
  { key: "error" as const, label: "Error" },
  { key: "success" as const, label: "Success" },
  { key: "warning" as const, label: "Warning" },
];

const BG_COLOR_FIELDS = [
  { key: "background" as const, label: "Background" },
  { key: "secondaryBackground" as const, label: "Secondary" },
];

const BORDER_RADII_FIELDS = [
  { key: "none" as const, label: "N/A" },
  { key: "sm" as const, label: "SM" },
  { key: "md" as const, label: "MD" },
  { key: "lg" as const, label: "LG" },
  { key: "xl" as const, label: "XL" },
  { key: "full" as const, label: "Full" },
];

const FONT_SIZE_FIELDS = [
  { key: "xs" as const, label: "XS" },
  { key: "sm" as const, label: "SM" },
  { key: "base" as const, label: "Base" },
  { key: "md" as const, label: "MD" },
  { key: "lg" as const, label: "LG" },
  { key: "xl" as const, label: "XL" },
  { key: "xxl" as const, label: "2XL" },
];

const SPACING_FIELDS = [
  { key: "xs" as const, label: "XS" },
  { key: "sm" as const, label: "SM" },
  { key: "md" as const, label: "MD" },
  { key: "lg" as const, label: "LG" },
  { key: "xl" as const, label: "XL" },
  { key: "xxl" as const, label: "2XL" },
];

function ColorRow({ label, value, onSwatchPress }: { label: string; value: string; onSwatchPress?: () => void }) {
  return (
    <Pressable style={styles.colorRow} onPress={onSwatchPress}>
      <View style={[styles.colorSwatch, { backgroundColor: value }]} />
      <Text style={styles.colorLabel}>{label}</Text>
      <Text style={styles.colorHex}>{value}</Text>
    </Pressable>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.numberRow}>
      <Text style={styles.numberLabel}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        value={String(value)}
        onChangeText={(t) => {
          const n = parseInt(t, 10);
          if (!isNaN(n) && n >= 0) onChange(n);
          else if (t === "") onChange(0);
        }}
        keyboardType="numeric"
        placeholderTextColor="rgba(255,255,255,0.25)"
      />
      <Text style={styles.unitLabel}>px</Text>
    </View>
  );
}

interface SettingsPageProps {
  width: number;
  isEditMode: boolean;
  snappingEnabled: boolean;
  inspectorEnabled: boolean;
  showAdvancedCode: boolean;
  onToggleEditMode: () => void;
  onToggleSnapping: () => void;
  onToggleInspector: () => void;
  onToggleAdvancedCode: () => void;
  onCloseSlate: () => void;
  onDeleteSlate: () => void;
  onClose: () => void;
  slate: AppSlate;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate)) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function SettingsPage({
  width,
  isEditMode,
  snappingEnabled,
  inspectorEnabled,
  showAdvancedCode,
  onToggleEditMode,
  onToggleSnapping,
  onToggleInspector,
  onToggleAdvancedCode,
  onCloseSlate,
  onDeleteSlate,
  onClose,
  slate,
  onSlateChange,
  apiKey,
  onApiKeyChange,
}: SettingsPageProps) {
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    type: "color" | "bgColor";
    key: string;
    currentValue: string;
  } | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  const theme = slate.theme ?? {};
  const colors = theme.colors ?? DEFAULT_COLORS;
  const bgColors = theme.backgroundColors ?? DEFAULT_BG_COLORS;
  const borderRadii = theme.borderRadii ?? DEFAULT_BORDER_RADII;
  const spacing = theme.spacing ?? DEFAULT_SPACING;
  const fontSizes = theme.fontSizes ?? DEFAULT_FONT_SIZES;

  const updateTheme = useCallback(
    (patch: Partial<Theme>) => {
      onSlateChange?.((prev) => ({
        ...prev,
        theme: { ...prev.theme, ...patch },
      }));
    },
    [onSlateChange],
  );

  const setColor = useCallback(
    (key: keyof typeof DEFAULT_COLORS, value: string) => {
      updateTheme({ colors: { ...colors, [key]: value } });
    },
    [colors, updateTheme],
  );

  const setBgColor = useCallback(
    (key: keyof typeof DEFAULT_BG_COLORS, value: string) => {
      updateTheme({ backgroundColors: { ...bgColors, [key]: value } });
    },
    [bgColors, updateTheme],
  );

  const setBorderRadius = useCallback(
    (key: keyof typeof DEFAULT_BORDER_RADII, value: number) => {
      updateTheme({ borderRadii: { ...borderRadii, [key]: value } });
    },
    [borderRadii, updateTheme],
  );

  const setSpacing = useCallback(
    (key: keyof typeof DEFAULT_SPACING, value: number) => {
      updateTheme({ spacing: { ...spacing, [key]: value } });
    },
    [spacing, updateTheme],
  );

  const setFontSize = useCallback(
    (key: keyof typeof DEFAULT_FONT_SIZES, value: number) => {
      updateTheme({ fontSizes: { ...fontSizes, [key]: value } });
    },
    [fontSizes, updateTheme],
  );

  const handleClose = () => {
    onClose();
    onCloseSlate();
  };

  const handleDelete = () => {
    onClose();
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Delete Slate?\n\nThis will permanently delete this slate. This cannot be undone."
        )
      ) {
        onDeleteSlate();
      }
    } else {
      Alert.alert(
        "Delete Slate",
        "This will permanently delete this slate. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDeleteSlate },
        ]
      );
    }
  };

  return (
    <View style={[styles.page, { width }]}>
      {/* Mode */}
      <Text style={styles.categoryHeader}>MODE</Text>
      <Pressable style={styles.row} onPress={onToggleEditMode}>
        <Text style={styles.rowLabel}>Preview Mode</Text>
        <View style={[styles.toggleTrack, !isEditMode && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, !isEditMode && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/* AI */}
      <Text style={styles.categoryHeader}>AI</Text>
      <View style={styles.aiSection}>
        <Text style={styles.rowLabel}>Anthropic API Key</Text>
        {apiKey && !showKeyInput ? (
          <View style={styles.keyDisplayRow}>
            <Text style={styles.keyMask}>
              {"*".repeat(8)}...{apiKey.slice(-4)}
            </Text>
            <Pressable
              style={styles.keyChangeBtn}
              onPress={() => { setShowKeyInput(true); setKeyDraft(""); }}
            >
              <Text style={styles.keyChangeBtnText}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.keyInputRow}>
            <TextInput
              style={styles.keyInput}
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder="sk-ant-..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Pressable
              style={[styles.keySaveBtn, !keyDraft.trim() && styles.keySaveBtnDisabled]}
              onPress={() => {
                if (keyDraft.trim()) {
                  onApiKeyChange(keyDraft.trim());
                  setShowKeyInput(false);
                  setKeyDraft("");
                }
              }}
              disabled={!keyDraft.trim()}
            >
              <Text style={styles.keySaveBtnText}>Save</Text>
            </Pressable>
            {apiKey && (
              <Pressable style={styles.keyCancelBtn} onPress={() => setShowKeyInput(false)}>
                <Text style={styles.keyCancelBtnText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Design */}
      <Text style={styles.categoryHeader}>DESIGN</Text>

      {isEditMode && (
        <Pressable style={styles.row} onPress={onToggleSnapping}>
          <Text style={styles.rowLabel}>Snap to Style Guides</Text>
          <View style={[styles.toggleTrack, snappingEnabled && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, snappingEnabled && styles.toggleThumbOn]} />
          </View>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [styles.row, styles.styleGuideRow, pressed && styles.styleGuideRowPressed]}
        onPress={() => setStyleGuideOpen((v) => !v)}
      >
        <Text style={styles.styleGuideLabel}>Set Style Guide</Text>
        <Text style={styles.chevron}>{styleGuideOpen ? "\u2212" : "+"}</Text>
      </Pressable>

      {styleGuideOpen && (
        <View style={styles.styleGuideContent}>
          <Text style={styles.categoryHeader}>THEME COLORS</Text>
          {COLOR_FIELDS.map((f) => (
            <ColorRow
              key={f.key}
              label={f.label}
              value={colors[f.key]}
              onSwatchPress={() => setColorPickerTarget({ type: "color", key: f.key, currentValue: colors[f.key] })}
            />
          ))}

          <View style={styles.divider} />

          <Text style={styles.categoryHeader}>BACKGROUND COLORS</Text>
          {BG_COLOR_FIELDS.map((f) => (
            <ColorRow
              key={f.key}
              label={f.label}
              value={bgColors[f.key]}
              onSwatchPress={() => setColorPickerTarget({ type: "bgColor", key: f.key, currentValue: bgColors[f.key] })}
            />
          ))}

          <View style={styles.divider} />

          <Text style={styles.categoryHeader}>BORDER RADII</Text>
          <View style={styles.gridContainer}>
            {BORDER_RADII_FIELDS.map((f) => (
              <NumberRow key={f.key} label={f.label} value={borderRadii[f.key]} onChange={(v) => setBorderRadius(f.key, v)} />
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.categoryHeader}>SPACING</Text>
          <View style={styles.gridContainer}>
            {SPACING_FIELDS.map((f) => (
              <NumberRow key={f.key} label={f.label} value={spacing[f.key]} onChange={(v) => setSpacing(f.key, v)} />
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.categoryHeader}>FONT SIZES</Text>
          <View style={styles.gridContainer}>
            {FONT_SIZE_FIELDS.map((f) => (
              <NumberRow key={f.key} label={f.label} value={fontSizes[f.key]} onChange={(v) => setFontSize(f.key, v)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.divider} />

      {/* Advanced */}
      <Text style={styles.categoryHeader}>ADVANCED</Text>
      <Pressable style={styles.row} onPress={onToggleInspector}>
        <Text style={styles.rowLabel}>View Code per Component</Text>
        <View style={[styles.toggleTrack, inspectorEnabled && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, inspectorEnabled && styles.toggleThumbOn]} />
        </View>
      </Pressable>
      <Pressable style={styles.row} onPress={onToggleAdvancedCode}>
        <Text style={styles.rowLabel}>Show Workflow Code</Text>
        <View style={[styles.toggleTrack, showAdvancedCode && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, showAdvancedCode && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/* Slate */}
      <Text style={styles.categoryHeader}>SLATE</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.projectRow, pressed && styles.projectRowPressed]}
        onPress={handleClose}
      >
        <Text style={styles.projectLabel}>Close & Save Slate</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Danger Zone */}
      <Text style={[styles.categoryHeader, styles.dangerHeader]}>DANGER ZONE</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.dangerRow, pressed && styles.dangerRowPressed]}
        onPress={handleDelete}
      >
        <Text style={styles.dangerLabel}>Delete Slate</Text>
      </Pressable>

      <ColorPickerModal
        visible={colorPickerTarget !== null}
        initialColor={colorPickerTarget?.currentValue ?? "#000000"}
        onSelect={(color) => {
          if (!colorPickerTarget) return;
          if (colorPickerTarget.type === "color") {
            setColor(colorPickerTarget.key as keyof typeof DEFAULT_COLORS, color);
          } else {
            setBgColor(colorPickerTarget.key as keyof typeof DEFAULT_BG_COLORS, color);
          }
        }}
        onClose={() => setColorPickerTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 4,
  },
  categoryHeader: sharedMenuStyles.categoryHeader,
  divider: sharedMenuStyles.divider,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  rowLabel: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  toggleTrack: sharedMenuStyles.toggleTrack,
  toggleTrackOn: sharedMenuStyles.toggleTrackOn,
  toggleThumb: sharedMenuStyles.toggleThumb,
  toggleThumbOn: sharedMenuStyles.toggleThumbOn,
  styleGuideRow: {
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
  },
  styleGuideRowPressed: {
    backgroundColor: "#111",
  },
  styleGuideLabel: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    letterSpacing: 0.3,
  },
  chevron: {
    color: "#444",
    fontSize: 18,
    fontWeight: "300",
  },
  styleGuideContent: {
    paddingBottom: 4,
  },
  projectRow: {
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
  },
  projectRowPressed: {
    backgroundColor: "#111",
  },
  projectLabel: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.3,
  },
  dangerHeader: {
    color: "#dc2626",
  },
  dangerRow: {
    backgroundColor: "rgba(220,38,38,0.06)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  dangerRowPressed: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  dangerLabel: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  // Style guide fields
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  colorLabel: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  colorHex: {
    color: "#888",
    fontSize: 13,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 6,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  numberLabel: {
    color: "#555",
    fontSize: 11,
    fontWeight: "600",
    width: 28,
    letterSpacing: 0.5,
  },
  numberInput: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "monospace",
    width: 36,
    textAlign: "center",
  },
  unitLabel: {
    color: "#333",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  // AI section
  aiSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  keyDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  keyMask: {
    color: "#555",
    fontSize: 13,
    fontFamily: "monospace",
    flex: 1,
    letterSpacing: 0.5,
  },
  keyChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  keyChangeBtnText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  keyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  keyInput: {
    flex: 1,
    minWidth: 150,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keySaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  keySaveBtnDisabled: {
    opacity: 0.3,
  },
  keySaveBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
  keyCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  keyCancelBtnText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
});
