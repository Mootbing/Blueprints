import React, { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { AppBlueprint, Variable } from "../../types";

// Generates a v4-like UUID
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const VAR_TYPES = ["string", "number", "boolean", "array", "object"] as const;

function defaultForType(type: Variable["type"]): unknown {
  switch (type) {
    case "string": return "";
    case "number": return 0;
    case "boolean": return false;
    case "array": return [];
    case "object": return {};
  }
}

interface VariablesPageProps {
  width: number;
  blueprint: AppBlueprint;
  screenId: string;
  onBlueprintChange?: (updater: AppBlueprint | ((prev: AppBlueprint) => AppBlueprint)) => void;
}

export function VariablesPage({ width, blueprint, screenId, onBlueprintChange }: VariablesPageProps) {
  const [scope, setScope] = useState<"app" | "screen">("app");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Variable["type"]>("string");
  const [editDefault, setEditDefault] = useState("");
  const [editPersist, setEditPersist] = useState(false);

  const appVars = blueprint.variables ?? [];
  const screenVars = blueprint.screens[screenId]?.variables ?? [];
  const variables = scope === "app" ? appVars : screenVars;

  const updateVariables = useCallback((newVars: Variable[]) => {
    if (!onBlueprintChange) return;
    onBlueprintChange((prev: AppBlueprint) => {
      if (scope === "app") {
        return { ...prev, variables: newVars };
      }
      const screen = prev.screens[screenId];
      if (!screen) return prev;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: { ...screen, variables: newVars },
        },
      };
    });
  }, [onBlueprintChange, scope, screenId]);

  const handleAdd = useCallback(() => {
    const newVar: Variable = {
      id: uuid(),
      name: `var${variables.length + 1}`,
      type: "string",
      defaultValue: "",
    };
    updateVariables([...variables, newVar]);
    // Start editing immediately
    setEditingId(newVar.id);
    setEditName(newVar.name);
    setEditType(newVar.type);
    setEditDefault("");
    setEditPersist(false);
  }, [variables, updateVariables]);

  const startEdit = useCallback((v: Variable) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditType(v.type);
    setEditDefault(formatDefault(v.defaultValue));
    setEditPersist(v.persist ?? false);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const parsed = parseDefault(editDefault, editType);
    const updated = variables.map((v) =>
      v.id === editingId
        ? { ...v, name: editName, type: editType, defaultValue: parsed, persist: editPersist || undefined }
        : v
    );
    updateVariables(updated);
    setEditingId(null);
  }, [editingId, editName, editType, editDefault, editPersist, variables, updateVariables]);

  const handleDelete = useCallback((id: string) => {
    updateVariables(variables.filter((v) => v.id !== id));
    if (editingId === id) setEditingId(null);
  }, [variables, updateVariables, editingId]);

  return (
    <View style={[styles.page, { width }]}>
      {/* Scope toggle */}
      <View style={styles.scopeRow}>
        <Pressable
          style={[styles.scopeBtn, scope === "app" && styles.scopeBtnActive]}
          onPress={() => setScope("app")}
        >
          <Text style={[styles.scopeLabel, scope === "app" && styles.scopeLabelActive]}>App</Text>
        </Pressable>
        <Pressable
          style={[styles.scopeBtn, scope === "screen" && styles.scopeBtnActive]}
          onPress={() => setScope("screen")}
        >
          <Text style={[styles.scopeLabel, scope === "screen" && styles.scopeLabelActive]}>Screen</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeader}>
        {scope === "app" ? "APP VARIABLES" : "SCREEN VARIABLES"}
      </Text>

      {variables.length === 0 && (
        <Text style={styles.emptyText}>No variables defined. Tap + to add one.</Text>
      )}

      {variables.map((v) => (
        <View key={v.id}>
          {editingId === v.id ? (
            <View style={styles.editCard}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Variable name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.typeRow}>
                {VAR_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.typeChip, editType === t && styles.typeChipActive]}
                    onPress={() => {
                      setEditType(t);
                      setEditDefault(formatDefault(defaultForType(t)));
                    }}
                  >
                    <Text style={[styles.typeChipText, editType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.editInput}
                value={editDefault}
                onChangeText={setEditDefault}
                placeholder="Default value"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.persistRow}>
                <Text style={styles.persistLabel}>Persist across restarts</Text>
                <Pressable onPress={() => setEditPersist((v) => !v)}>
                  <View style={[styles.toggleTrack, editPersist && styles.toggleTrackOn]}>
                    <View style={[styles.toggleThumb, editPersist && styles.toggleThumbOn]} />
                  </View>
                </Pressable>
              </View>
              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={saveEdit}>
                  <Text style={styles.saveLabel}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.varRow} onPress={() => startEdit(v)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.varName}>{v.name}</Text>
                <Text style={styles.varMeta}>
                  {v.type} = {formatDefault(v.defaultValue)}
                  {v.persist ? " (persisted)" : ""}
                </Text>
              </View>
              <Pressable style={styles.deleteBtn} onPress={() => handleDelete(v.id)}>
                <Text style={styles.deleteLabel}>X</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      ))}

      {/* Add button */}
      <Pressable style={styles.addBtn} onPress={handleAdd}>
        <Text style={styles.addLabel}>+ Add Variable</Text>
      </Pressable>
    </View>
  );
}

function formatDefault(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}

function parseDefault(raw: string, type: Variable["type"]): unknown {
  switch (type) {
    case "string": return raw;
    case "number": return Number(raw) || 0;
    case "boolean": return raw === "true";
    case "array":
    case "object":
      try { return JSON.parse(raw); }
      catch { return type === "array" ? [] : {}; }
  }
}

const styles = StyleSheet.create({
  page: { paddingTop: 4 },
  scopeRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  scopeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scopeBtnActive: { backgroundColor: "#6366f1" },
  scopeLabel: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" },
  scopeLabelActive: { color: "#ffffff" },
  sectionHeader: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  varRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  varName: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  varMeta: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: { color: "#fca5a5", fontSize: 12, fontWeight: "700" },
  editCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  editInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  typeChipActive: { backgroundColor: "#6366f1" },
  typeChipText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  typeChipTextActive: { color: "#ffffff" },
  persistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  persistLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleTrackOn: { backgroundColor: "#6366f1" },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#ffffff" },
  toggleThumbOn: { alignSelf: "flex-end" as const },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  cancelLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "600" },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#6366f1",
  },
  saveLabel: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  addBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.4)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addLabel: { color: "#818cf8", fontSize: 14, fontWeight: "600" },
});
