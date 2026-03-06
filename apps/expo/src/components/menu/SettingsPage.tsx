import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Pressable, Text, TextInput, StyleSheet, Platform, Share, Modal } from "react-native";
import { crossAlert } from "../../utils/crossAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppSlateSchema } from "../../types";
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
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: '#111', borderRadius: 16, padding: 24, width: 260,
            alignItems: 'center', borderWidth: 1, borderColor: '#222',
          }}
          onStartShouldSetResponder={() => true}
        >
          <View style={{ height: 72, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Demo value={value} />
          </View>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', fontFamily: 'monospace' }}>
            {value}<Text style={{ color: '#555', fontSize: 14, fontWeight: '500' }}>px</Text>
          </Text>
          <Text style={{ color: '#666', fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 20, letterSpacing: 1 }}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
            <Pressable
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => onValueChange(Math.max(range.min, value - 1))}
            >
              <Text style={{ color: '#888', fontSize: 18, fontWeight: '600' }}>{"\u2212"}</Text>
            </Pressable>
            <View
              style={{ flex: 1, height: 36, justifyContent: 'center', overflow: 'visible' }}
              onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
              onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
            >
              <View style={{ height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 4, backgroundColor: '#fff', width: `${ratio * 100}%` }} />
              </View>
              <View
                style={{
                  position: 'absolute', left: `${ratio * 100}%`, top: 8,
                  width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                  transform: [{ translateX: -10 }],
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
                }}
                pointerEvents="none"
              />
            </View>
            <Pressable
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => onValueChange(Math.min(range.max, value + 1))}
            >
              <Text style={{ color: '#888', fontSize: 18, fontWeight: '600' }}>+</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

interface SlateExportProject {
  _exportType: "project";
  slate: AppSlate;
  history?: unknown;
  chatLog?: unknown;
  agentSessions?: unknown;
  exportedAt: number;
}

interface SlateExportApp {
  _exportType: "app";
  slate: AppSlate;
  exportedAt: number;
}

type SlateExport = SlateExportProject | SlateExportApp;

function triggerWebDownload(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  slateId?: string;
  slateName?: string;
  onRenameSlate?: (name: string) => void;
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
  slateId,
  slateName,
  onRenameSlate,
  onSlateChange,
  apiKey,
  onApiKeyChange,
}: SettingsPageProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(slateName ?? "");
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    type: "color" | "bgColor";
    key: string;
    currentValue: string;
  } | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [activeEditor, setActiveEditor] = useState<{ type: EditorType; key: string; label: string } | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doExport = useCallback(
    async (mode: "project" | "app") => {
      const name = slateName || slate.screens[slate.initial_screen_id]?.name || "slate";
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const timestamp = Date.now();

      if (mode === "project" && slateId) {
        const [historyRaw, chatLogRaw, agentRaw] = await Promise.all([
          AsyncStorage.getItem(`undo_history_${slateId}`).catch(() => null),
          AsyncStorage.getItem(`chat_log_${slateId}`).catch(() => null),
          AsyncStorage.getItem(`agent_sessions_${slateId}`).catch(() => null),
        ]);
        const payload: SlateExportProject = {
          _exportType: "project",
          slate,
          history: historyRaw ? JSON.parse(historyRaw) : undefined,
          chatLog: chatLogRaw ? JSON.parse(chatLogRaw) : undefined,
          agentSessions: agentRaw ? JSON.parse(agentRaw) : undefined,
          exportedAt: timestamp,
        };
        const json = JSON.stringify(payload, null, 2);
        const filename = `${safeName}_${timestamp}.json`;

        if (Platform.OS === "web") {
          triggerWebDownload(json, filename);
        } else {
          Share.share({ message: json, title: filename });
        }
      } else {
        const payload: SlateExportApp = {
          _exportType: "app",
          slate,
          exportedAt: timestamp,
        };
        const json = JSON.stringify(payload, null, 2);
        const filename = `${safeName}_${timestamp}.json`;

        if (Platform.OS === "web") {
          triggerWebDownload(json, filename);
        } else {
          Share.share({ message: json, title: filename });
        }
      }
    },
    [slate, slateId, slateName],
  );

  const handleExport = useCallback(() => {
    if (!slateId) {
      doExport("app");
      return;
    }
    crossAlert(
      "Export Slate",
      "Export Project includes history & AI logs.\nExport App is a clean slate without logs.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export App", onPress: () => doExport("app") },
        { text: "Export Project", onPress: () => doExport("project") },
      ],
    );
  }, [slateId, doExport]);

  const processImport = useCallback(
    async (text: string) => {
      try {
        const data = JSON.parse(text) as SlateExport;
        if (!data || typeof data !== "object" || !data.slate) {
          crossAlert("Import Failed", "Invalid file: missing slate data.");
          return;
        }
        const parsed = AppSlateSchema.safeParse(data.slate);
        if (!parsed.success) {
          crossAlert("Import Failed", "Invalid slate format:\n" + parsed.error.issues.map((i) => i.message).join(", "));
          return;
        }
        onSlateChange?.(parsed.data);

        // Restore project data if available
        if (slateId && data._exportType === "project") {
          const proj = data as SlateExportProject;
          const ops: Promise<void>[] = [];
          if (proj.history) {
            ops.push(AsyncStorage.setItem(`undo_history_${slateId}`, JSON.stringify(proj.history)));
          }
          if (proj.chatLog) {
            ops.push(AsyncStorage.setItem(`chat_log_${slateId}`, JSON.stringify(proj.chatLog)));
          }
          if (proj.agentSessions) {
            ops.push(AsyncStorage.setItem(`agent_sessions_${slateId}`, JSON.stringify(proj.agentSessions)));
          }
          await Promise.all(ops);
          crossAlert("Import Complete", "Project imported with history and AI logs. Reopen the slate to see restored history.");
        } else {
          crossAlert("Import Complete", "App slate imported successfully.");
        }
      } catch (e) {
        crossAlert("Import Failed", "Could not parse JSON file.");
      }
    },
    [onSlateChange, slateId],
  );

  const handleImport = useCallback(() => {
    if (Platform.OS === "web") {
      // Create or reuse hidden file input
      if (!fileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.style.display = "none";
        input.addEventListener("change", () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              processImport(reader.result);
            }
          };
          reader.readAsText(file);
          input.value = "";
        });
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.click();
    } else {
      crossAlert("Import", "Paste your exported JSON below is not yet supported on this platform. Please use the web version to import.");
    }
  }, [processImport]);

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
      <View style={styles.exportImportRow}>
        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
          onPress={handleExport}
        >
          <Text style={styles.exportBtnText}>Export</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
          onPress={handleImport}
        >
          <Text style={styles.exportBtnText}>Import</Text>
        </Pressable>
      </View>
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
