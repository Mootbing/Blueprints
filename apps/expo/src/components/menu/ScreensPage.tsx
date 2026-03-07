import React, { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from "react-native";
import { crossAlert } from "../../utils/crossAlert";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import type { Screen, Component, AppSlate, Action, Workflow, WorkflowBlock } from "../../types";
import { sharedMenuStyles } from "./sharedStyles";
import { TreeView } from "./TreeView";
import { flattenComponentTree, getComponentLabel, getChildren, withChildren } from "../../utils/componentTree";

// ─── Collapsible Section Header ─────────────────────────────────────────────

function SectionHeader({
  title,
  isOpen,
  onToggle,
  trailing,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.collapsibleHeader} onPress={onToggle}>
      <Feather
        name={isOpen ? "chevron-down" : "chevron-right"}
        size={14}
        color="#444"
      />
      <Text style={styles.collapsibleHeaderText}>{title}</Text>
      {trailing}
    </Pressable>
  );
}

// ─── Details Page (Pages + Layers + Workflows) ─────────────────────────────

interface DetailsPageProps {
  width: number;
  // Pages
  screens: Record<string, Screen>;
  currentScreenId: string;
  initialScreenId: string;
  onSwitchScreen: (id: string) => void;
  onAddScreen: () => void;
  onDeleteScreen: (id: string) => void;
  onRenameScreen: (id: string, name: string) => void;
  onSetInitialScreen: (id: string) => void;
  // Layers
  currentScreenName: string;
  currentComponents: Component[];
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  lockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  onMoveComponent?: (componentId: string, toIndex: number, parentId: string | null) => void;
  onReparentComponent?: (componentId: string, newParentId: string | null) => void;
  onAIChatComponent?: (id: string) => void;
  // Workflows
  slate: AppSlate;
  currentScreen?: Screen;
  showAdvancedCode: boolean;
  onNavigateToAgent?: () => void;
  // Navigation
  onNavigateToCanvas?: () => void;
  onOpenAgentPager?: (sessionId?: string, initialMessage?: string) => void;
  // Common
  onClose: () => void;
}

export function DetailsPage({
  width,
  screens,
  currentScreenId,
  initialScreenId,
  onSwitchScreen,
  onAddScreen,
  onDeleteScreen,
  onRenameScreen,
  onSetInitialScreen,
  currentScreenName,
  currentComponents,
  onSelectComponent,
  onDeleteComponent,
  lockedIds,
  onToggleLock,
  onMoveComponent,
  onReparentComponent,
  onAIChatComponent,
  slate,
  currentScreen,
  showAdvancedCode,
  onNavigateToAgent,

  onNavigateToCanvas,
  onOpenAgentPager,
  onClose,
}: DetailsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["pages", "layers", "workflows"]),
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);

  // Screen-level workflows (AI-generated)
  const screenWorkflows: Workflow[] = useMemo(
    () => currentScreen?.workflows ?? [],
    [currentScreen?.workflows],
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const q = searchQuery.trim().toLowerCase();

  // ─── Pages filtering ──────────────────────────────────────────
  const allScreens = Object.values(screens);
  const filteredScreens = q
    ? allScreens.filter((s) => s.name.toLowerCase().includes(q))
    : allScreens;

  // ─── Layers filtering ─────────────────────────────────────────
  const filteredComponents = useMemo(() => {
    if (!q) return currentComponents;
    const matchesQuery = (c: Component): boolean => {
      const label = getComponentLabel(c).toLowerCase();
      const type = c.type.toLowerCase();
      return label.includes(q) || type.includes(q);
    };
    const filterTree = (comps: Component[]): Component[] =>
      comps
        .map((c) => {
          const selfMatches = matchesQuery(c);
          const kids = getChildren(c);
          const childMatches = kids ? filterTree(kids) : [];
          if (selfMatches || childMatches.length > 0) {
            if (kids) {
              return withChildren(c, selfMatches ? kids : childMatches);
            }
            return c;
          }
          return null;
        })
        .filter(Boolean) as Component[];
    return filterTree(currentComponents);
  }, [currentComponents, q]);

  // ─── Workflows filtering ──────────────────────────────────────
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

  const logicComponents = useMemo(
    () =>
      q
        ? allLogicComponents.filter(({ component: c }) =>
            getComponentLabel(c, { includeType: true }).toLowerCase().includes(q),
          )
        : allLogicComponents,
    [allLogicComponents, q],
  );
  const variables = useMemo(
    () => (q ? allVariables.filter((v) => v.name.toLowerCase().includes(q)) : allVariables),
    [allVariables, q],
  );

  // ─── Pages helpers ────────────────────────────────────────────
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

  const handleDeleteScreen = (id: string) => {
    if (allScreens.length <= 1) {
      crossAlert("Cannot delete", "You must have at least one screen.");
      return;
    }
    const screen = screens[id];
    crossAlert(
      "Delete Screen",
      `Delete "${screen?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteScreen(id),
        },
      ],
    );
  };

  return (
    <View style={[styles.page, { width }]}>
      {/* Shared search bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={14} color="#333" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search pages, layers, workflows..."
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

      {/* ─── PAGES section ──────────────────────────────────────── */}
      <SectionHeader
        title="PAGES"
        isOpen={openSections.has("pages")}
        onToggle={() => toggleSection("pages")}
        trailing={
          !q ? (
            <Pressable onPress={onAddScreen} hitSlop={8}>
              <Feather name="plus" size={14} color="#555" />
            </Pressable>
          ) : undefined
        }
      />
      {openSections.has("pages") && (
        <>
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
                    onPress={() => handleDeleteScreen(screen.id)}
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

          {q && filteredScreens.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pages match "{searchQuery}"</Text>
            </View>
          )}
        </>
      )}

      {/* ─── LAYERS section ─────────────────────────────────────── */}
      <SectionHeader
        title="LAYERS"
        isOpen={openSections.has("layers")}
        onToggle={() => toggleSection("layers")}
        trailing={
          onNavigateToCanvas ? (
            <Pressable onPress={onNavigateToCanvas} hitSlop={8}>
              <Feather name="plus" size={14} color="#555" />
            </Pressable>
          ) : undefined
        }
      />
      {openSections.has("layers") && (
        <>
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
            onReparentComponent={onReparentComponent}
            onAIChatComponent={
              onAIChatComponent
                ? (id) => {
                    onAIChatComponent(id);
                    onClose();
                  }
                : undefined
            }
          />
          {filteredComponents.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {q ? `No layers match "${searchQuery}"` : "No components on canvas"}
              </Text>
            </View>
          )}
        </>
      )}

      {/* ─── WORKFLOWS section ──────────────────────────────────── */}
      <SectionHeader
        title="WORKFLOWS"
        isOpen={openSections.has("workflows")}
        onToggle={() => toggleSection("workflows")}
        trailing={
          onOpenAgentPager ? (
            <Pressable
              onPress={() => onOpenAgentPager("__new__", "Create a workflow that ")}
              hitSlop={8}
            >
              <Feather name="plus" size={14} color="#555" />
            </Pressable>
          ) : undefined
        }
      />
      {openSections.has("workflows") && (
        <>
          {screenWorkflows.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="zap" size={24} color="#222" />
              <Text style={styles.emptyText}>No workflows yet</Text>
              <Text style={styles.emptyHint}>
                Ask the AI agent to create workflows — they'll appear here as interactive blocks.
              </Text>
              {onOpenAgentPager && (
                <Pressable
                  style={styles.wfCreateBtn}
                  onPress={() => onOpenAgentPager("__new__", "Create a workflow that ")}
                >
                  <MaterialIcons name="auto-awesome" size={14} color="#000" />
                  <Text style={styles.wfCreateBtnText}>Create with AI</Text>
                </Pressable>
              )}
            </View>
          ) : (
            screenWorkflows.map((wf) => {
              const isExpanded = expandedWorkflowId === wf.id;

              return (
                <View key={wf.id} style={styles.wfCard}>
                  <Pressable
                    style={styles.wfCardHeader}
                    onPress={() => setExpandedWorkflowId(isExpanded ? null : wf.id)}
                  >
                    <View style={styles.wfCardIcon}>
                      <Feather name="zap" size={14} color="#f59e0b" />
                    </View>
                    <View style={styles.wfCardInfo}>
                      <Text style={styles.wfCardTitle}>{wf.title}</Text>
                      <Text style={styles.wfCardDesc} numberOfLines={isExpanded ? undefined : 2}>
                        {wf.description}
                      </Text>
                    </View>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#333"
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.wfBlocksContainer}>
                      {wf.blocks.map((block) => (
                        <View key={block.id} style={styles.wfBlock}>
                          <View style={styles.wfBlockLeft}>
                            <View style={styles.wfBlockDot}>
                              <Feather
                                name={(block.icon as any) ?? "box"}
                                size={12}
                                color="#888"
                              />
                            </View>
                            <View style={styles.wfBlockConnector} />
                          </View>
                          <View style={styles.wfBlockContent}>
                            <Text style={styles.wfBlockTitle}>{block.title}</Text>
                            <Text style={styles.wfBlockDesc}>{block.description}</Text>
                          </View>
                          {onOpenAgentPager && (
                            <Pressable
                              style={({ pressed }) => [
                                styles.wfBlockSparkle,
                                pressed && styles.wfBlockSparklePressed,
                              ]}
                              onPress={() =>
                                onOpenAgentPager(
                                  "__new__",
                                  `Modify the "${block.title}" block in the "${wf.title}" workflow: `,
                                )
                              }
                              hitSlop={6}
                            >
                              <MaterialIcons name="auto-awesome" size={14} color="#f59e0b" />
                            </Pressable>
                          )}
                        </View>
                      ))}

                      <View style={styles.wfCardActions}>
                        {onOpenAgentPager && (
                          <Pressable
                            style={({ pressed }) => [
                              styles.expandedActionBtn,
                              styles.expandedAiBtn,
                              pressed && styles.expandedAiBtnPressed,
                            ]}
                            onPress={() =>
                              onOpenAgentPager("__new__", `Modify the "${wf.title}" workflow: `)
                            }
                          >
                            <MaterialIcons name="auto-awesome" size={14} color="#f59e0b" />
                            <Text style={styles.expandedAiBtnText}>Modify</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateExplanation(comp: Component, slate: AppSlate): string {
  const parts: string[] = [];
  if (comp.visibleWhen) {
    parts.push(`only shown when a condition is met`);
  }
  if (comp.bindings && Object.keys(comp.bindings).length > 0) {
    const props = Object.keys(comp.bindings);
    parts.push(`displays ${props.join(", ")} from variable data`);
  }
  if (comp.actions) {
    for (const [event, actions] of Object.entries(comp.actions)) {
      if (!actions || actions.length === 0) continue;
      const summaries: string[] = [];
      for (const action of actions) {
        switch (action.type) {
          case "SET_VARIABLE": summaries.push(`sets a variable`); break;
          case "TOGGLE_VARIABLE": summaries.push(`toggles a variable`); break;
          case "NAVIGATE": {
            const screen = slate.screens[action.target];
            summaries.push(`navigates to ${screen?.name ?? "another screen"}`);
            break;
          }
          case "OPEN_URL": summaries.push(`opens a URL`); break;
          case "RESET_CANVAS": summaries.push(`resets the canvas`); break;
          case "FETCH": summaries.push(`fetches data from API`); break;
          case "RUN_CODE": summaries.push(`runs custom code`); break;
          case "CONDITIONAL": summaries.push(`runs conditional logic`); break;
        }
      }
      parts.push(`on ${event}, ${summaries.join(" and ")}`);
    }
  }
  if (parts.length === 0) return "No logic configured for this component.";
  return parts.join(". ") + ".";
}

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
    case "FETCH":
      return [`${indent}FETCH ${action.method ?? "GET"} ${action.url} → "${action.resultVariable}"`];
    case "RUN_CODE":
      return [`${indent}RUN CODE (${action.code.length} chars)`];
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
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  collapsibleHeaderText: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    flex: 1,
  },
  sectionHeader: sharedMenuStyles.sectionHeader,
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
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginVertical: 12,
  },
  emptyContainer: {
    paddingVertical: 24,
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
  explanationText: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
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
  expandedActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  expandedActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  expandedAiBtn: {
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  expandedAiBtnPressed: {
    backgroundColor: "rgba(245,158,11,0.2)",
  },
  expandedAiBtnText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
  expandedDeleteBtn: {
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  expandedDeleteBtnPressed: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  expandedDeleteBtnText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },

  // New workflow card styles
  wfCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  wfCreateBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },
  wfCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
  },
  wfCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
  },
  wfCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  wfCardInfo: {
    flex: 1,
  },
  wfCardTitle: {
    color: "#ddd",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  wfCardDesc: {
    color: "#666",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  wfBlocksContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 0,
  },
  wfBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minHeight: 44,
  },
  wfBlockLeft: {
    alignItems: "center",
    width: 28,
  },
  wfBlockDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  wfBlockConnector: {
    width: 1,
    flex: 1,
    backgroundColor: "#1a1a1a",
    minHeight: 8,
  },
  wfBlockContent: {
    flex: 1,
    paddingBottom: 10,
  },
  wfBlockTitle: {
    color: "#bbb",
    fontSize: 13,
    fontWeight: "600",
  },
  wfBlockDesc: {
    color: "#555",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  wfBlockSparkle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  wfBlockSparklePressed: {
    backgroundColor: "rgba(245,158,11,0.2)",
  },
  wfCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    paddingLeft: 38,
  },
});
