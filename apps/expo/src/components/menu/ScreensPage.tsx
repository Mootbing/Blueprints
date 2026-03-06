import React, { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, Alert, StyleSheet, Platform } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import type { Screen, Component, AppSlate, Action } from "../../types";
import { sharedMenuStyles } from "./sharedStyles";
import { TreeView } from "./TreeView";
import { flattenComponentTree, getComponentLabel } from "../../utils/componentTree";

// ─── Layers Page ────────────────────────────────────────────────────────────

interface LayersPageProps {
  width: number;
  currentScreenName: string;
  currentComponents: Component[];
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  lockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  onMoveComponent?: (componentId: string, toIndex: number, parentId: string | null) => void;
  onClose: () => void;
}

export function LayersPage({
  width,
  currentScreenName,
  currentComponents,
  onSelectComponent,
  onDeleteComponent,
  lockedIds,
  onToggleLock,
  onMoveComponent,
  onClose,
}: LayersPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredComponents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentComponents;
    const filterTree = (comps: Component[]): Component[] =>
      comps
        .map((c) => {
          const label = getComponentLabel(c).toLowerCase();
          const childMatches = c.type === "group" && c.children ? filterTree(c.children) : [];
          if (label.includes(q) || childMatches.length > 0) {
            if (c.type === "group" && c.children) {
              return { ...c, children: label.includes(q) ? c.children : childMatches };
            }
            return c;
          }
          return null;
        })
        .filter(Boolean) as Component[];
    return filterTree(currentComponents);
  }, [currentComponents, searchQuery]);

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={14} color="#333" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search layers..."
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={14} color="#444" />
          </Pressable>
        )}
      </View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>LAYERS</Text>
        <Text style={styles.sectionHint}>Higher is above</Text>
      </View>
      <TreeView
        components={filteredComponents}
        onSelectComponent={(id) => {
          onSelectComponent(id);
          onClose();
        }}
        onDeleteComponent={onDeleteComponent}
        lockedIds={lockedIds}
        onToggleLock={onToggleLock}
        onMoveComponent={onMoveComponent}
      />
    </View>
  );
}

// ─── Pages Page ─────────────────────────────────────────────────────────────

interface PagesPageProps {
  width: number;
  screens: Record<string, Screen>;
  currentScreenId: string;
  initialScreenId: string;
  onSwitchScreen: (id: string) => void;
  onAddScreen: () => void;
  onDeleteScreen: (id: string) => void;
  onRenameScreen: (id: string, name: string) => void;
  onSetInitialScreen: (id: string) => void;
  onClose: () => void;
}

export function PagesPage({
  width,
  screens,
  currentScreenId,
  initialScreenId,
  onSwitchScreen,
  onAddScreen,
  onDeleteScreen,
  onRenameScreen,
  onSetInitialScreen,
  onClose,
}: PagesPageProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allScreens = Object.values(screens);
  const q = searchQuery.trim().toLowerCase();
  const filteredScreens = q
    ? allScreens.filter((s) => s.name.toLowerCase().includes(q))
    : allScreens;

  const startRename = (screen: Screen) => {
    setRenamingId(screen.id);
    setRenameText(screen.name);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      onRenameScreen(renamingId, renameText.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = (id: string) => {
    if (allScreens.length <= 1) {
      Alert.alert("Cannot delete", "You must have at least one screen.");
      return;
    }
    const screen = screens[id];
    Alert.alert(
      "Delete Screen",
      `Delete "${screen?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteScreen(id),
        },
      ]
    );
  };

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={14} color="#333" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search pages..."
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={14} color="#444" />
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionHeader}>PAGES</Text>

      {filteredScreens.map((screen) => {
        const isCurrent = screen.id === currentScreenId;
        const isInitial = screen.id === initialScreenId;
        const componentCount = screen.components.length;

        return (
          <Pressable
            key={screen.id}
            style={styles.screenRow}
            onPress={() => {
              onSwitchScreen(screen.id);
              onClose();
            }}
          >
            <View style={styles.screenInfo}>
              {renamingId === screen.id ? (
                <TextInput
                  style={styles.renameInput}
                  value={renameText}
                  onChangeText={setRenameText}
                  onBlur={commitRename}
                  onSubmitEditing={commitRename}
                  autoFocus
                  selectTextOnFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <Text style={styles.screenName}>{screen.name}</Text>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.screenMeta}>
                  {componentCount} component{componentCount !== 1 ? "s" : ""}
                </Text>
                {isInitial && (
                  <View style={styles.badgeInitial}>
                    <Text style={styles.badgeText}>Initial</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={styles.badgeCurrent}>
                    <Text style={styles.badgeText}>Current</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.iconBtn} onPress={() => startRename(screen)}>
                <Feather name="edit-2" size={14} color="#555" />
              </Pressable>
              {!isInitial && (
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => onSetInitialScreen(screen.id)}
                >
                  <Feather name="home" size={14} color="#555" />
                </Pressable>
              )}
              <Pressable
                style={[styles.iconBtn, allScreens.length <= 1 && styles.iconBtnDisabled]}
                onPress={() => handleDelete(screen.id)}
                disabled={allScreens.length <= 1}
              >
                <Feather
                  name="trash-2"
                  size={14}
                  color={allScreens.length <= 1 ? "#222" : "#dc2626"}
                />
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      {!q && (
        <Pressable style={styles.addPageBtn} onPress={onAddScreen}>
          <Feather name="plus" size={14} color="#888" />
          <Text style={styles.addPageBtnText}>Add New Page</Text>
        </Pressable>
      )}

      {q && filteredScreens.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
        </View>
      )}
    </View>
  );
}

// ─── Workflows Page ─────────────────────────────────────────────────────────

interface WorkflowsSummaryPageProps {
  width: number;
  currentComponents: Component[];
  slate: AppSlate;
  currentScreen?: Screen;
  showAdvancedCode: boolean;
}

export function WorkflowsSummaryPage({
  width,
  currentComponents,
  slate,
  currentScreen,
  showAdvancedCode,
}: WorkflowsSummaryPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const flatNodes = useMemo(
    () => flattenComponentTree(currentComponents, 0, null, "", false),
    [currentComponents],
  );

  const allLogicComponents = useMemo(
    () =>
      flatNodes.filter(({ component: c }) => {
        const hasActions = c.actions
          ? Object.values(c.actions).some((arr) => arr && arr.length > 0)
          : false;
        const hasBindings = c.bindings
          ? Object.keys(c.bindings).length > 0
          : false;
        const hasVisible = !!c.visibleWhen;
        return hasActions || hasBindings || hasVisible;
      }),
    [flatNodes],
  );

  const allVariables = useMemo(() => {
    const appVars = slate.variables ?? [];
    const screenVars = currentScreen?.variables ?? [];
    return [...appVars, ...screenVars];
  }, [slate.variables, currentScreen?.variables]);

  const q = searchQuery.trim().toLowerCase();
  const logicComponents = useMemo(
    () => q
      ? allLogicComponents.filter(({ component: c }) =>
          getComponentLabel(c, { includeType: true }).toLowerCase().includes(q)
        )
      : allLogicComponents,
    [allLogicComponents, q],
  );
  const variables = useMemo(
    () => q ? allVariables.filter((v) => v.name.toLowerCase().includes(q)) : allVariables,
    [allVariables, q],
  );

  if (allLogicComponents.length === 0 && allVariables.length === 0) {
    return (
      <View style={[styles.page, { width }]}>
        <View style={styles.emptyContainer}>
          <Feather name="zap" size={24} color="#222" />
          <Text style={styles.emptyText}>No workflows configured</Text>
          <Text style={styles.emptyHint}>
            Add actions, bindings, or visibility rules to components to see them here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={14} color="#333" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search workflows..."
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={14} color="#444" />
          </Pressable>
        )}
      </View>

      {variables.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>VARIABLES</Text>
          {variables.map((v) => (
            <View key={v.id} style={styles.varRow}>
              <View style={styles.varDot} />
              <Text style={styles.varName}>{v.name}</Text>
              <Text style={styles.varType}>{v.type}</Text>
              <Text style={styles.varDefault}>
                = {JSON.stringify(v.defaultValue)}
              </Text>
            </View>
          ))}
        </>
      )}

      {logicComponents.length === 0 && variables.length > 0 && (
        <Text style={styles.wfEmptyText}>
          Variables defined but no component logic yet.
        </Text>
      )}

      {logicComponents.length > 0 && (
        <>
          {variables.length > 0 && <View style={styles.sectionDivider} />}
          <Text style={styles.sectionHeader}>COMPONENT LOGIC</Text>
        </>
      )}

      {logicComponents.map(({ component: comp }) => {
        const isExpanded = expandedId === comp.id;
        const pseudocode = generatePseudocode(comp, slate);

        return (
          <View key={comp.id}>
            <Pressable
              style={styles.workflowRow}
              onPress={() => setExpandedId(isExpanded ? null : comp.id)}
            >
              <Feather name="zap" size={14} color="#555" style={{ marginTop: 2 }} />
              <View style={styles.workflowInfo}>
                <Text style={styles.workflowTitle}>
                  {getComponentLabel(comp, { includeType: true })}
                </Text>
                <View style={styles.wfBadgeRow}>
                  {comp.actions &&
                    Object.keys(comp.actions).length > 0 && (
                      <View style={styles.wfBadge}>
                        <Text style={styles.wfBadgeText}>Actions</Text>
                      </View>
                    )}
                  {comp.bindings &&
                    Object.keys(comp.bindings).length > 0 && (
                      <View style={styles.wfBadge}>
                        <Text style={styles.wfBadgeText}>Bindings</Text>
                      </View>
                    )}
                  {comp.visibleWhen && (
                    <View style={styles.wfBadge}>
                      <Text style={styles.wfBadgeText}>Visibility</Text>
                    </View>
                  )}
                </View>
              </View>
              <MaterialIcons name="auto-awesome" size={14} color="#555" />
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#333"
              />
            </Pressable>

            {isExpanded && (
              <View style={styles.expandedSection}>
                <Text style={styles.pseudoHeader}>LOGIC</Text>
                {pseudocode.map((line, i) => (
                  <Text key={i} style={styles.pseudoLine}>
                    {line}
                  </Text>
                ))}
                {showAdvancedCode && (
                  <>
                    <Text style={styles.pseudoHeader}>CODE</Text>
                    <View style={styles.codeBlock}>
                      <Text style={styles.codeText}>
                        {JSON.stringify(
                          {
                            actions: comp.actions,
                            bindings: comp.bindings,
                            visibleWhen: comp.visibleWhen,
                          },
                          null,
                          2,
                        )}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePseudocode(comp: Component, slate: AppSlate): string[] {
  const lines: string[] = [];
  if (comp.visibleWhen) lines.push(`VISIBLE WHEN: ${comp.visibleWhen}`);
  if (comp.bindings) {
    for (const [prop, expr] of Object.entries(comp.bindings)) {
      lines.push(`DISPLAY ${prop} FROM variable "${expr}"`);
    }
  }
  if (comp.actions) {
    for (const [event, actions] of Object.entries(comp.actions)) {
      if (!actions || actions.length === 0) continue;
      lines.push(`WHEN ${event}:`);
      for (const action of actions) {
        lines.push(...describeAction(action, slate, "  "));
      }
    }
  }
  if (lines.length === 0) lines.push("(no logic configured)");
  return lines;
}

function describeAction(action: Action, slate: AppSlate, indent: string): string[] {
  switch (action.type) {
    case "SET_VARIABLE":
      return [`${indent}SET "${action.key}" = ${action.value}`];
    case "TOGGLE_VARIABLE":
      return [`${indent}TOGGLE "${action.key}"`];
    case "NAVIGATE": {
      const screen = slate.screens[action.target];
      return [`${indent}NAVIGATE TO "${screen?.name ?? action.target}"`];
    }
    case "OPEN_URL":
      return [`${indent}OPEN URL: ${action.url}`];
    case "RESET_CANVAS":
      return [`${indent}RESET CANVAS`];
    case "CONDITIONAL": {
      const lines = [`${indent}IF ${action.condition}:`];
      for (const a of action.then) {
        lines.push(...describeAction(a, slate, indent + "  "));
      }
      if (action.else && action.else.length > 0) {
        lines.push(`${indent}ELSE:`);
        for (const a of action.else) {
          lines.push(...describeAction(a, slate, indent + "  "));
        }
      }
      return lines;
    }
    default:
      return [`${indent}UNKNOWN ACTION`];
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { paddingTop: 4 },
  sectionHeader: sharedMenuStyles.sectionHeader,
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
  },
  sectionHint: {
    color: "#333",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ccc",
    fontSize: 14,
    padding: 0,
  },
  screenRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  screenInfo: { flex: 1 },
  screenName: { color: "#ccc", fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
  renameInput: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  screenMeta: {
    color: "#444",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.3,
  },
  badgeInitial: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  badgeCurrent: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  badgeText: {
    color: "#555",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  addPageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    backgroundColor: "#0a0a0a",
  },
  addPageBtnText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginVertical: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#333",
    fontSize: 14,
  },
  emptyHint: {
    color: "#282828",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  // Workflow styles
  varRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 8,
  },
  varDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#555",
  },
  varName: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  varType: {
    color: "#444",
    fontSize: 11,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  varDefault: {
    color: "#444",
    fontSize: 11,
    flex: 1,
    fontVariant: ["tabular-nums"],
  },
  wfEmptyText: {
    color: "#444",
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  workflowRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  workflowInfo: { flex: 1 },
  workflowTitle: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  wfBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  wfBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  wfBadgeText: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  expandedSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#0a0a0a",
  },
  pseudoHeader: {
    color: "#444",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginTop: 10,
    marginBottom: 4,
  },
  pseudoLine: {
    color: "#999",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 18,
    paddingLeft: 4,
  },
  codeBlock: {
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  codeText: {
    color: "#666",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 14,
  },
});
