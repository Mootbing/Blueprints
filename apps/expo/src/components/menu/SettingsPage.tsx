import React, { useState, useCallback } from "react";
import { View, Pressable, Text, TextInput, StyleSheet, Platform, Alert } from "react-native";
import type { AppBlueprint, Theme } from "../../types";
import { sharedMenuStyles } from "./sharedStyles";
import { ColorPickerModal } from "../ColorPickerModal";

const DEFAULT_COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  error: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
};

const DEFAULT_BG_COLORS = {
  background: "#ffffff",
  secondaryBackground: "#f3f4f6",
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

function ColorRow({ label, value, onChange, onSwatchPress }: { label: string; value: string; onChange: (v: string) => void; onSwatchPress?: () => void }) {
  return (
    <View style={styles.colorRow}>
      <Pressable onPress={onSwatchPress} hitSlop={4}>
        <View style={[styles.colorSwatch, { backgroundColor: value }]} />
      </Pressable>
      <Text style={styles.colorLabel}>{label}</Text>
      <TextInput
        style={styles.colorInput}
        value={value}
        onChangeText={onChange}
        placeholder="#000000"
        placeholderTextColor="rgba(255,255,255,0.25)"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
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
  onToggleEditMode: () => void;
  onToggleSnapping: () => void;
  onToggleInspector: () => void;
  onCloseBlueprint: () => void;
  onDeleteBlueprint: () => void;
  onClose: () => void;
  blueprint: AppBlueprint;
  onBlueprintChange?: (updater: AppBlueprint | ((prev: AppBlueprint) => AppBlueprint)) => void;
}

export function SettingsPage({
  width,
  isEditMode,
  snappingEnabled,
  inspectorEnabled,
  onToggleEditMode,
  onToggleSnapping,
  onToggleInspector,
  onCloseBlueprint,
  onDeleteBlueprint,
  onClose,
  blueprint,
  onBlueprintChange,
}: SettingsPageProps) {
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    type: "color" | "bgColor";
    key: string;
    currentValue: string;
  } | null>(null);

  const theme = blueprint.theme ?? {};
  const colors = theme.colors ?? DEFAULT_COLORS;
  const bgColors = theme.backgroundColors ?? DEFAULT_BG_COLORS;
  const borderRadii = theme.borderRadii ?? DEFAULT_BORDER_RADII;
  const spacing = theme.spacing ?? DEFAULT_SPACING;
  const fontSizes = theme.fontSizes ?? DEFAULT_FONT_SIZES;

  const updateTheme = useCallback(
    (patch: Partial<Theme>) => {
      onBlueprintChange?.((prev) => ({
        ...prev,
        theme: { ...prev.theme, ...patch },
      }));
    },
    [onBlueprintChange],
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
    onCloseBlueprint();
  };

  const handleDelete = () => {
    onClose();
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Delete Blueprint?\n\nThis will permanently delete this blueprint. This cannot be undone."
        )
      ) {
        onDeleteBlueprint();
      }
    } else {
      Alert.alert(
        "Delete Blueprint",
        "This will permanently delete this blueprint. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDeleteBlueprint },
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

      {isEditMode && (
        <Pressable style={styles.row} onPress={onToggleSnapping}>
          <Text style={styles.rowLabel}>Snap to Style Guides</Text>
          <View style={[styles.toggleTrack, snappingEnabled && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, snappingEnabled && styles.toggleThumbOn]} />
          </View>
        </Pressable>
      )}

      <View style={styles.divider} />

      {/* Style Guide */}
      <Text style={styles.categoryHeader}>DESIGN</Text>
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
              onChange={(v) => setColor(f.key, v)}
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
              onChange={(v) => setBgColor(f.key, v)}
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

      <View style={styles.divider} />

      {/* Blueprint */}
      <Text style={styles.categoryHeader}>BLUEPRINT</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.projectRow, pressed && styles.projectRowPressed]}
        onPress={handleClose}
      >
        <Text style={styles.projectLabel}>Close Blueprint</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Danger Zone */}
      <Text style={[styles.categoryHeader, styles.dangerHeader]}>DANGER ZONE</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.dangerRow, pressed && styles.dangerRowPressed]}
        onPress={handleDelete}
      >
        <Text style={styles.dangerLabel}>Delete Blueprint</Text>
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
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  toggleTrack: sharedMenuStyles.toggleTrack,
  toggleTrackOn: sharedMenuStyles.toggleTrackOn,
  toggleThumb: sharedMenuStyles.toggleThumb,
  toggleThumbOn: sharedMenuStyles.toggleThumbOn,
  styleGuideRow: {
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  styleGuideRowPressed: {
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  styleGuideLabel: {
    color: "#a5b4fc",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  chevron: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
    fontWeight: "600",
  },
  styleGuideContent: {
    paddingBottom: 4,
  },
  projectRow: {
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  projectRowPressed: {
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  projectLabel: {
    color: "#a5b4fc",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  dangerHeader: {
    color: "rgba(239,68,68,0.6)",
  },
  dangerRow: {
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  dangerRowPressed: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  dangerLabel: {
    color: "#fca5a5",
    fontSize: 16,
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
    borderColor: "rgba(255,255,255,0.15)",
  },
  colorLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  colorInput: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "monospace",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 100,
    textAlign: "center",
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  numberLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    width: 28,
  },
  numberInput: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "monospace",
    width: 36,
    textAlign: "center",
  },
  unitLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
});
