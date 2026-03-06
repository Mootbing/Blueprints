import React, { useState, useCallback, useRef } from "react";
import { View, Pressable, Text, TextInput, StyleSheet, Platform, Modal, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { crossAlert } from "../../utils/crossAlert";
import type { AppSlate, Theme } from "../../types";
import type { StorageProvider, SyncableStorageProvider } from "../../storage/StorageProvider";
import { sharedMenuStyles } from "./sharedStyles";
import { ColorPickerModal } from "../ColorPickerModal";
import { ShareModal } from "../ShareModal";

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

function NumberRow({ label, value, onChange, onPress }: { label: string; value: number; onChange: (v: number) => void; onPress?: () => void }) {
  return (
    <Pressable style={styles.numberRow} onPress={onPress}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } as any : {})}>
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
      </View>
      <Text style={styles.unitLabel}>px</Text>
    </Pressable>
  );
}

type EditorType = 'borderRadius' | 'spacing' | 'fontSize';

const SLIDER_RANGES: Record<EditorType, { min: number; max: number }> = {
  borderRadius: { min: 0, max: 50 },
  spacing: { min: 0, max: 64 },
  fontSize: { min: 6, max: 48 },
};

function BorderRadiusDemo({ value }: { value: number }) {
  const r = Math.min(value, 40);
  return (
    <View style={{ width: 64, height: 64, borderWidth: 2, borderColor: '#444', borderTopLeftRadius: r }} />
  );
}

function SpacingDemo({ value }: { value: number }) {
  const gap = Math.max(2, Math.min(value, 48));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 28, height: 28, backgroundColor: '#333', borderRadius: 4, borderWidth: 1.5, borderColor: '#555' }} />
      <View style={{ width: gap }} />
      <View style={{ width: 28, height: 28, backgroundColor: '#333', borderRadius: 4, borderWidth: 1.5, borderColor: '#555' }} />
    </View>
  );
}

function FontSizeDemo({ value }: { value: number }) {
  const size = Math.max(12, Math.min(value, 40));
  return <Text style={{ color: '#fff', fontSize: size, fontWeight: '600' }}>Aa</Text>;
}

function ValueEditorModal({
  type, label, value, onValueChange, onClose,
}: {
  type: EditorType; label: string; value: number;
  onValueChange: (v: number) => void; onClose: () => void;
}) {
  const range = SLIDER_RANGES[type];
  const trackWidthRef = useRef(0);
  const clamped = Math.max(range.min, Math.min(range.max, value));
  const ratio = range.max > range.min ? (clamped - range.min) / (range.max - range.min) : 0;

  const handleTouch = useCallback((locationX: number) => {
    if (trackWidthRef.current <= 0) return;
    const r = Math.max(0, Math.min(1, locationX / trackWidthRef.current));
    onValueChange(Math.round(range.min + r * (range.max - range.min)));
  }, [range, onValueChange]);

  const Demo = type === 'borderRadius' ? BorderRadiusDemo : type === 'spacing' ? SpacingDemo : FontSizeDemo;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={veStyles.overlay}>
        <View style={veStyles.sheet}>
          <View style={veStyles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={veStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={veStyles.title}>{label}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={veStyles.doneText}>Done</Text>
            </Pressable>
          </View>

          <View style={veStyles.demoRow}>
            <Demo value={value} />
          </View>

          <Text style={veStyles.valueDisplay}>
            {value}<Text style={veStyles.valueUnit}>px</Text>
          </Text>

          <View style={veStyles.sliderRow}>
            <Pressable
              style={veStyles.stepBtn}
              onPress={() => onValueChange(Math.max(range.min, value - 1))}
            >
              <Text style={veStyles.stepBtnText}>{"\u2212"}</Text>
            </Pressable>
            <View
              style={veStyles.sliderTrackWrap}
              onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
              onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
            >
              <View style={veStyles.sliderTrack}>
                <View style={[veStyles.sliderFill, { width: `${ratio * 100}%` }]} />
              </View>
              <View
                style={[veStyles.sliderThumb, { left: `${ratio * 100}%` }]}
                pointerEvents="none"
              />
            </View>
            <Pressable
              style={veStyles.stepBtn}
              onPress={() => onValueChange(Math.min(range.max, value + 1))}
            >
              <Text style={veStyles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const veStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  cancelText: {
    color: "#555",
    fontSize: 16,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  demoRow: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  valueDisplay: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "monospace",
    textAlign: "center",
    marginBottom: 24,
  },
  valueUnit: {
    color: "#555",
    fontSize: 16,
    fontWeight: "500",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnText: {
    color: "#888",
    fontSize: 20,
    fontWeight: "600",
  },
  sliderTrackWrap: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    overflow: "visible",
  },
  sliderTrack: {
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
  },
  sliderFill: {
    height: 4,
    backgroundColor: "#fff",
  },
  sliderThumb: {
    position: "absolute",
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    transform: [{ translateX: -10 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

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
  slateId?: string;
  slateName?: string;
  onRenameSlate?: (name: string) => void;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate), description?: string) => void;
  storage?: StorageProvider;
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
  slateId,
  slateName,
  onRenameSlate,
  onSlateChange,
  storage,
}: SettingsPageProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(slateName ?? "")
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    type: "color" | "bgColor";
    key: string;
    currentValue: string;
  } | null>(null);
  const [activeEditor, setActiveEditor] = useState<{ type: EditorType; key: string; label: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const isSyncable = storage && 'joinCollabChannel' in storage;

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
      }), "Updated theme");
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
      crossAlert(
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
      {/* Design */}
      <Text style={styles.categoryHeader}>DESIGN</Text>

      {isEditMode && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Snap to Style Guides</Text>
          <Switch
            value={snappingEnabled}
            onValueChange={onToggleSnapping}
            trackColor={{ false: "#222", true: "#fff" }}
            thumbColor={snappingEnabled ? "#000" : "#555"}
          />
        </View>
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
              <NumberRow key={f.key} label={f.label} value={borderRadii[f.key]} onChange={(v) => setBorderRadius(f.key, v)} onPress={() => setActiveEditor({ type: 'borderRadius', key: f.key, label: f.label })} />
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.categoryHeader}>SPACING</Text>
          <View style={styles.gridContainer}>
            {SPACING_FIELDS.map((f) => (
              <NumberRow key={f.key} label={f.label} value={spacing[f.key]} onChange={(v) => setSpacing(f.key, v)} onPress={() => setActiveEditor({ type: 'spacing', key: f.key, label: f.label })} />
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.categoryHeader}>FONT SIZES</Text>
          <View style={styles.gridContainer}>
            {FONT_SIZE_FIELDS.map((f) => (
              <NumberRow key={f.key} label={f.label} value={fontSizes[f.key]} onChange={(v) => setFontSize(f.key, v)} onPress={() => setActiveEditor({ type: 'fontSize', key: f.key, label: f.label })} />
            ))}
          </View>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.resetStyleGuideBtn, pressed && styles.resetStyleGuideBtnPressed]}
            onPress={() => {
              crossAlert("Reset Style Guide", "Reset all theme values to defaults?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => {
                  onSlateChange?.((prev) => {
                    const { theme: _, ...rest } = prev;
                    return rest as typeof prev;
                  }, "Reset theme to defaults");
                }},
              ]);
            }}
          >
            <Feather name="rotate-ccw" size={14} color="#ef4444" />
            <Text style={styles.resetStyleGuideText}>Reset to Defaults</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.divider} />

      {/* Advanced */}
      <Text style={styles.categoryHeader}>ADVANCED</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Show Code on Component</Text>
        <Switch
          value={inspectorEnabled}
          onValueChange={onToggleInspector}
          trackColor={{ false: "#222", true: "#fff" }}
          thumbColor={inspectorEnabled ? "#000" : "#555"}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Show Workflow Code</Text>
        <Switch
          value={showAdvancedCode}
          onValueChange={onToggleAdvancedCode}
          trackColor={{ false: "#222", true: "#fff" }}
          thumbColor={showAdvancedCode ? "#000" : "#555"}
        />
      </View>

      <View style={styles.divider} />

      {/* Slate */}
      <Text style={styles.categoryHeader}>SLATE</Text>
      <View style={styles.renameRow}>
        {isRenaming ? (
          <View style={styles.renameInputRow}>
            <TextInput
              style={styles.renameInput}
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              onSubmitEditing={() => {
                const trimmed = renameDraft.trim();
                if (trimmed && onRenameSlate) {
                  onRenameSlate(trimmed);
                }
                setIsRenaming(false);
              }}
              returnKeyType="done"
              placeholderTextColor="rgba(255,255,255,0.25)"
            />
            <Pressable
              style={[styles.keySaveBtn, !renameDraft.trim() && styles.keySaveBtnDisabled]}
              onPress={() => {
                const trimmed = renameDraft.trim();
                if (trimmed && onRenameSlate) {
                  onRenameSlate(trimmed);
                }
                setIsRenaming(false);
              }}
              disabled={!renameDraft.trim()}
            >
              <Text style={styles.keySaveBtnText}>Save</Text>
            </Pressable>
            <Pressable style={styles.keyCancelBtn} onPress={() => { setRenameDraft(slateName ?? ""); setIsRenaming(false); }}>
              <Text style={styles.keyCancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.renameDisplay}
            onPress={() => { setRenameDraft(slateName ?? ""); setIsRenaming(true); }}
          >
            <Text style={styles.renameNameText} numberOfLines={1}>{slateName || "Untitled"}</Text>
            <Text style={styles.renamePencil}>Rename</Text>
          </Pressable>
        )}
      </View>
      {isSyncable && slateId && (
        <View style={styles.exportImportRow}>
          <Pressable
            style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
            onPress={() => setShareModalOpen(true)}
          >
            <Text style={styles.exportBtnText}>Live Share</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.divider} />

      {/* Danger Zone */}
      <Text style={[styles.categoryHeader, styles.dangerHeader]}>DANGER ZONE</Text>
      <Pressable
        style={({ pressed }) => [styles.row, styles.dangerRow, pressed && styles.dangerRowPressed]}
        onPress={handleDelete}
      >
        <Text style={styles.dangerLabel}>Delete Slate</Text>
      </Pressable>

      {activeEditor && (
        <ValueEditorModal
          type={activeEditor.type}
          label={activeEditor.label}
          value={
            activeEditor.type === 'borderRadius' ? borderRadii[activeEditor.key as keyof typeof DEFAULT_BORDER_RADII]
            : activeEditor.type === 'spacing' ? spacing[activeEditor.key as keyof typeof DEFAULT_SPACING]
            : fontSizes[activeEditor.key as keyof typeof DEFAULT_FONT_SIZES]
          }
          onValueChange={(v) => {
            if (activeEditor.type === 'borderRadius') setBorderRadius(activeEditor.key as keyof typeof DEFAULT_BORDER_RADII, v);
            else if (activeEditor.type === 'spacing') setSpacing(activeEditor.key as keyof typeof DEFAULT_SPACING, v);
            else setFontSize(activeEditor.key as keyof typeof DEFAULT_FONT_SIZES, v);
          }}
          onClose={() => setActiveEditor(null)}
        />
      )}

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

      {isSyncable && slateId && (
        <ShareModal
          visible={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          storage={storage as SyncableStorageProvider}
          slateId={slateId}
        />
      )}
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
  resetStyleGuideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  resetStyleGuideBtnPressed: {
    backgroundColor: "rgba(239,68,68,0.18)",
  },
  resetStyleGuideText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
  },
  renameRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  renameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  renameInput: {
    flex: 1,
    minWidth: 150,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 8,
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  renameDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  renameNameText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    letterSpacing: 0.3,
  },
  renamePencil: {
    color: "#555",
    fontSize: 13,
    fontWeight: "500",
  },
  exportImportRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  exportBtnPressed: {
    backgroundColor: "#111",
  },
  exportBtnText: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  projectRow: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 10,
    marginHorizontal: 20,
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
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
    borderRadius: 10,
    marginHorizontal: 20,
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
