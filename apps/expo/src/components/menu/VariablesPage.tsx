import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Switch } from "react-native";
import type { AppSlate, Variable, Component, Action, EventHandlers } from "../../types";
import { uuid } from "../../utils/uuid";
import { deepUpdateComponent, flattenComponentTree, getComponentLabel } from "../../utils/componentTree";
import { sharedMenuStyles } from "./sharedStyles";

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

const EVENT_NAMES: (keyof NonNullable<EventHandlers>)[] = ["onTap", "onLongPress", "onChange", "onSubmit"];
const ACTION_TYPES = ["SET_VARIABLE", "TOGGLE_VARIABLE", "NAVIGATE", "OPEN_URL", "CONDITIONAL"] as const;

function describeAction(action: Action, slate: AppSlate): string {
  switch (action.type) {
    case "SET_VARIABLE": return `Set "${action.key}" to ${action.value}`;
    case "TOGGLE_VARIABLE": return `Toggle "${action.key}"`;
    case "NAVIGATE": {
      const screen = slate.screens[action.target];
      return `Navigate to "${screen?.name ?? action.target}"`;
    }
    case "OPEN_URL": return `Open ${action.url}`;
    case "CONDITIONAL": return `If ${action.condition} then...`;
  }
}

function getBindableProps(comp: Component): string[] {
  switch (comp.type) {
    case "text": return ["content", "fontSize", "color", "backgroundColor"];
    case "button": return ["label", "textColor", "backgroundColor"];
    case "image": return ["src"];
    case "toggle": return ["label", "defaultValue"];
    case "textInput": return ["placeholder", "defaultValue", "boundVariable"];
    case "shape": return ["backgroundColor", "borderColor", "opacity"];
    case "icon": return ["name", "color", "size"];
    case "container": return ["backgroundColor"];
    case "divider": return ["color", "thickness"];
    case "list": return ["backgroundColor"];
    default: return [];
  }
}

function getVariableNames(slate: AppSlate, screenId: string): string[] {
  const appVars = (slate.variables ?? []).map((v) => v.name);
  const screenVars = (slate.screens[screenId]?.variables ?? []).map((v) => v.name);
  return [...appVars, ...screenVars];
}

function hasLogic(comp: Component): { actions: boolean; bindings: boolean; visible: boolean } {
  const actions = comp.actions ? Object.values(comp.actions).some((arr) => arr && arr.length > 0) : false;
  const bindings = comp.bindings ? Object.keys(comp.bindings).length > 0 : false;
  const visible = !!comp.visibleWhen;
  return { actions, bindings, visible };
}

// --- Main component ---

interface VariablesPageProps {
  width: number;
  slate: AppSlate;
  screenId: string;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate)) => void;
}

export function VariablesPage({ width, slate, screenId, onSlateChange }: VariablesPageProps) {
  const [scope, setScope] = useState<"app" | "screen" | "logic">("app");

  return (
    <View style={[styles.page, { width }]}>
      {/* Scope toggle */}
      <View style={styles.scopeRow}>
        {(["app", "screen", "logic"] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.scopeLabel, scope === s && styles.scopeLabelActive]}>
              {s === "app" ? "App" : s === "screen" ? "Screen" : "Logic"}
            </Text>
          </Pressable>
        ))}
      </View>

      {scope === "logic" ? (
        <LogicSection
          slate={slate}
          screenId={screenId}
          onSlateChange={onSlateChange}
        />
      ) : (
        <VariablesSection
          slate={slate}
          screenId={screenId}
          scope={scope}
          onSlateChange={onSlateChange}
        />
      )}
    </View>
  );
}

// --- Variables Section (existing logic extracted) ---

function VariablesSection({
  slate, screenId, scope, onSlateChange,
}: {
  slate: AppSlate;
  screenId: string;
  scope: "app" | "screen";
  onSlateChange?: VariablesPageProps["onSlateChange"];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Variable["type"]>("string");
  const [editDefault, setEditDefault] = useState("");
  const [editPersist, setEditPersist] = useState(false);

  const appVars = slate.variables ?? [];
  const screenVars = slate.screens[screenId]?.variables ?? [];
  const variables = scope === "app" ? appVars : screenVars;

  const updateVariables = useCallback((newVars: Variable[]) => {
    if (!onSlateChange) return;
    onSlateChange((prev: AppSlate) => {
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
  }, [onSlateChange, scope, screenId]);

  const handleAdd = useCallback(() => {
    const newVar: Variable = {
      id: uuid(),
      name: `var${variables.length + 1}`,
      type: "string",
      defaultValue: "",
    };
    updateVariables([...variables, newVar]);
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
    <>
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
                placeholderTextColor="#333"
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
                placeholderTextColor="#333"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.persistRow}>
                <Text style={styles.persistLabel}>Persist across restarts</Text>
                <Switch
                  value={editPersist}
                  onValueChange={setEditPersist}
                  trackColor={{ false: "#222", true: "#fff" }}
                  thumbColor={editPersist ? "#000" : "#555"}
                />
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

      <Pressable style={styles.addBtn} onPress={handleAdd}>
        <Text style={styles.addLabel}>+ Add Variable</Text>
      </Pressable>
    </>
  );
}

// --- Logic Section ---

function LogicSection({
  slate, screenId, onSlateChange,
}: {
  slate: AppSlate;
  screenId: string;
  onSlateChange?: VariablesPageProps["onSlateChange"];
}) {
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  const screen = slate.screens[screenId];
  const components = screen?.components ?? [];
  const flatComponents = useMemo(() => flattenComponentTree(components, 0, null, "", false), [components]);

  const updateComponent = useCallback((id: string, updater: (c: Component) => Component) => {
    if (!onSlateChange) return;
    onSlateChange((prev: AppSlate) => {
      const scr = prev.screens[screenId];
      if (!scr) return prev;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: { ...scr, components: deepUpdateComponent(scr.components, id, updater) },
        },
      };
    });
  }, [onSlateChange, screenId]);

  if (selectedCompId) {
    const flat = flatComponents.find((f) => f.component.id === selectedCompId);
    if (!flat) {
      setSelectedCompId(null);
      return null;
    }
    return (
      <ComponentLogicDetail
        component={flat.component}
        slate={slate}
        screenId={screenId}
        onBack={() => setSelectedCompId(null)}
        updateComponent={(updater) => updateComponent(selectedCompId, updater)}
      />
    );
  }

  return (
    <>
      <Text style={styles.sectionHeader}>COMPONENTS</Text>
      {flatComponents.length === 0 && (
        <Text style={styles.emptyText}>No components on this screen.</Text>
      )}
      {flatComponents.map(({ component: comp, depth }) => {
        const logic = hasLogic(comp);
        const hasSomething = logic.actions || logic.bindings || logic.visible;
        return (
          <Pressable
            key={comp.id}
            style={[styles.varRow, { paddingLeft: 20 + depth * 16 }]}
            onPress={() => setSelectedCompId(comp.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.varName}>{getComponentLabel(comp, { includeType: true })}</Text>
              {hasSomething && (
                <View style={styles.badgeRow}>
                  {logic.actions && <View style={styles.badge}><Text style={styles.badgeText}>Actions</Text></View>}
                  {logic.bindings && <View style={styles.badge}><Text style={styles.badgeText}>Bindings</Text></View>}
                  {logic.visible && <View style={styles.badgeVis}><Text style={styles.badgeText}>Visible</Text></View>}
                </View>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}
    </>
  );
}

// --- Component Logic Detail ---

function ComponentLogicDetail({
  component, slate, screenId, onBack, updateComponent,
}: {
  component: Component;
  slate: AppSlate;
  screenId: string;
  onBack: () => void;
  updateComponent: (updater: (c: Component) => Component) => void;
}) {
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [addingActionFor, setAddingActionFor] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<{ event: string; index: number } | null>(null);
  const [addingBinding, setAddingBinding] = useState(false);
  const [editingVisibility, setEditingVisibility] = useState(false);

  const varNames = useMemo(() => getVariableNames(slate, screenId), [slate, screenId]);
  const screenNames = useMemo(() =>
    Object.values(slate.screens).map((s) => ({ id: s.id, name: s.name })),
    [slate.screens]
  );

  const toggleEvent = (ev: string) =>
    setExpandedEvents((prev) => ({ ...prev, [ev]: !prev[ev] }));

  // --- Actions CRUD ---
  const addAction = (event: string, action: Action) => {
    updateComponent((c) => {
      const actions: Record<string, Action[]> = { ...(c.actions ?? {}) };
      actions[event] = [...(actions[event] ?? []), action];
      return { ...c, actions } as Component;
    });
    setAddingActionFor(null);
  };

  const deleteAction = (event: string, index: number) => {
    updateComponent((c) => {
      const actions: Record<string, Action[]> = { ...(c.actions ?? {}) };
      const arr = [...(actions[event] ?? [])];
      arr.splice(index, 1);
      if (arr.length === 0) {
        delete actions[event];
      } else {
        actions[event] = arr;
      }
      const cleaned = Object.keys(actions).length > 0 ? actions : undefined;
      return { ...c, actions: cleaned } as Component;
    });
  };

  const updateAction = (event: string, index: number, action: Action) => {
    updateComponent((c) => {
      const actions: Record<string, Action[]> = { ...(c.actions ?? {}) };
      const arr = [...(actions[event] ?? [])];
      arr[index] = action;
      actions[event] = arr;
      return { ...c, actions } as Component;
    });
    setEditingAction(null);
  };

  // --- Bindings CRUD ---
  const setBinding = (prop: string, expr: string) => {
    updateComponent((c) => {
      const bindings = { ...(c.bindings ?? {}), [prop]: expr };
      return { ...c, bindings } as Component;
    });
    setAddingBinding(false);
  };

  const removeBinding = (prop: string) => {
    updateComponent((c) => {
      const bindings = { ...(c.bindings ?? {}) };
      delete bindings[prop];
      const cleaned = Object.keys(bindings).length > 0 ? bindings : undefined;
      return { ...c, bindings: cleaned } as Component;
    });
  };

  // --- Visibility ---
  const setVisibleWhen = (expr: string | undefined) => {
    updateComponent((c) => ({ ...c, visibleWhen: expr || undefined } as Component));
    setEditingVisibility(false);
  };

  return (
    <>
      {/* Back navigation */}
      <Pressable style={styles.backRow} onPress={onBack}>
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backLabel}>Components</Text>
      </Pressable>
      <Text style={styles.detailTitle}>{getComponentLabel(component, { includeType: true })}</Text>

      {/* Section A: Actions */}
      <Text style={styles.sectionHeader}>ACTIONS</Text>
      {EVENT_NAMES.map((event) => {
        const actions = component.actions?.[event] ?? [];
        const expanded = expandedEvents[event] ?? actions.length > 0;
        return (
          <View key={event}>
            <Pressable style={styles.eventHeader} onPress={() => toggleEvent(event)}>
              <Text style={styles.eventName}>{event}</Text>
              <View style={styles.eventRight}>
                {actions.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{actions.length}</Text>
                  </View>
                )}
                <Text style={styles.chevronSmall}>{expanded ? "▾" : "›"}</Text>
              </View>
            </Pressable>
            {expanded && (
              <View style={styles.eventBody}>
                {actions.map((action, i) => (
                  <View key={i}>
                    {editingAction?.event === event && editingAction.index === i ? (
                      <ActionEditor
                        action={action}
                        varNames={varNames}
                        screens={screenNames}
                        onSave={(a) => updateAction(event, i, a)}
                        onCancel={() => setEditingAction(null)}
                      />
                    ) : (
                      <Pressable
                        style={styles.actionRow}
                        onPress={() => setEditingAction({ event, index: i })}
                      >
                        <Text style={styles.actionDesc}>{describeAction(action, slate)}</Text>
                        <Pressable style={styles.deleteBtn} onPress={() => deleteAction(event, i)}>
                          <Text style={styles.deleteLabel}>X</Text>
                        </Pressable>
                      </Pressable>
                    )}
                  </View>
                ))}
                {addingActionFor === event ? (
                  <ActionEditor
                    varNames={varNames}
                    screens={screenNames}
                    onSave={(a) => addAction(event, a)}
                    onCancel={() => setAddingActionFor(null)}
                  />
                ) : (
                  <Pressable style={styles.addBtnSmall} onPress={() => setAddingActionFor(event)}>
                    <Text style={styles.addLabel}>+ Add Action</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Section B: Bindings */}
      <Text style={styles.sectionHeader}>BINDINGS</Text>
      {component.bindings && Object.entries(component.bindings).map(([prop, expr]) => (
        <View key={prop} style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bindingProp}>{prop}</Text>
            <Text style={styles.bindingExpr}>{expr}</Text>
          </View>
          <Pressable style={styles.deleteBtn} onPress={() => removeBinding(prop)}>
            <Text style={styles.deleteLabel}>X</Text>
          </Pressable>
        </View>
      ))}
      {addingBinding ? (
        <BindingEditor
          component={component}
          varNames={varNames}
          existingProps={Object.keys(component.bindings ?? {})}
          onSave={setBinding}
          onCancel={() => setAddingBinding(false)}
        />
      ) : (
        <Pressable style={styles.addBtnSmall} onPress={() => setAddingBinding(true)}>
          <Text style={styles.addLabel}>+ Add Binding</Text>
        </Pressable>
      )}

      {/* Section C: Visibility */}
      <Text style={styles.sectionHeader}>VISIBILITY</Text>
      {editingVisibility ? (
        <VisibilityEditor
          current={component.visibleWhen}
          varNames={varNames}
          onSave={setVisibleWhen}
          onCancel={() => setEditingVisibility(false)}
        />
      ) : (
        <Pressable style={styles.visRow} onPress={() => setEditingVisibility(true)}>
          <Text style={component.visibleWhen ? styles.visExpr : styles.visAlways}>
            {component.visibleWhen ?? "Always visible"}
          </Text>
          {component.visibleWhen && (
            <Pressable style={styles.deleteBtn} onPress={() => setVisibleWhen(undefined)}>
              <Text style={styles.deleteLabel}>X</Text>
            </Pressable>
          )}
        </Pressable>
      )}
    </>
  );
}

// --- Action Editor ---

function ActionEditor({
  action, varNames, screens, onSave, onCancel,
}: {
  action?: Action;
  varNames: string[];
  screens: { id: string; name: string }[];
  onSave: (a: Action) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<Action["type"]>(action?.type ?? "SET_VARIABLE");
  const [key, setKey] = useState(action && ("key" in action) ? action.key : "");
  const [value, setValue] = useState(action?.type === "SET_VARIABLE" ? action.value : "");
  const [target, setTarget] = useState(action?.type === "NAVIGATE" ? action.target : (screens[0]?.id ?? ""));
  const [url, setUrl] = useState(action?.type === "OPEN_URL" ? action.url : "");
  const [condition, setCondition] = useState(action?.type === "CONDITIONAL" ? action.condition : "");

  const save = () => {
    switch (type) {
      case "SET_VARIABLE": onSave({ type, key, value }); break;
      case "TOGGLE_VARIABLE": onSave({ type, key }); break;
      case "NAVIGATE": onSave({ type, target }); break;
      case "OPEN_URL": onSave({ type, url }); break;
      case "CONDITIONAL": onSave({ type, condition, then: action?.type === "CONDITIONAL" ? action.then : [] }); break;
    }
  };

  return (
    <View style={styles.editCard}>
      {/* Type selector */}
      <View style={styles.typeRow}>
        {ACTION_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
              {t === "SET_VARIABLE" ? "Set" :
               t === "TOGGLE_VARIABLE" ? "Toggle" :
               t === "NAVIGATE" ? "Navigate" :
               t === "OPEN_URL" ? "Open URL" : "If"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Type-specific fields */}
      {(type === "SET_VARIABLE" || type === "TOGGLE_VARIABLE") && (
        <>
          <TextInput
            style={styles.editInput}
            value={key}
            onChangeText={setKey}
            placeholder="Variable name"
            placeholderTextColor="#333"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {varNames.length > 0 && (
            <View style={styles.typeRow}>
              {varNames.map((v) => (
                <Pressable key={v} style={styles.suggestionChip} onPress={() => setKey(v)}>
                  <Text style={styles.suggestionText}>{v}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {type === "SET_VARIABLE" && (
            <TextInput
              style={styles.editInput}
              value={value}
              onChangeText={setValue}
              placeholder="Value (expression)"
              placeholderTextColor="#333"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        </>
      )}

      {type === "NAVIGATE" && (
        <View style={styles.typeRow}>
          {screens.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.typeChip, target === s.id && styles.typeChipActive]}
              onPress={() => setTarget(s.id)}
            >
              <Text style={[styles.typeChipText, target === s.id && styles.typeChipTextActive]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {type === "OPEN_URL" && (
        <TextInput
          style={styles.editInput}
          value={url}
          onChangeText={setUrl}
          placeholder="URL or expression"
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {type === "CONDITIONAL" && (
        <>
          <TextInput
            style={styles.editInput}
            value={condition}
            onChangeText={setCondition}
            placeholder="Condition expression"
            placeholderTextColor="#333"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {varNames.length > 0 && (
            <View style={styles.typeRow}>
              {varNames.map((v) => (
                <Pressable key={v} style={styles.suggestionChip} onPress={() => setCondition((c) => c + `variables.${v}`)}>
                  <Text style={styles.suggestionText}>{v}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.editActions}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Binding Editor ---

function BindingEditor({
  component, varNames, existingProps, onSave, onCancel,
}: {
  component: Component;
  varNames: string[];
  existingProps: string[];
  onSave: (prop: string, expr: string) => void;
  onCancel: () => void;
}) {
  const availableProps = getBindableProps(component).filter((p) => !existingProps.includes(p));
  const [prop, setProp] = useState(availableProps[0] ?? "");
  const [expr, setExpr] = useState("");

  return (
    <View style={styles.editCard}>
      <Text style={styles.fieldLabel}>Property</Text>
      {availableProps.length > 0 ? (
        <View style={styles.typeRow}>
          {availableProps.map((p) => (
            <Pressable
              key={p}
              style={[styles.typeChip, prop === p && styles.typeChipActive]}
              onPress={() => setProp(p)}
            >
              <Text style={[styles.typeChipText, prop === p && styles.typeChipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <TextInput
          style={styles.editInput}
          value={prop}
          onChangeText={setProp}
          placeholder="Property key"
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
      <Text style={styles.fieldLabel}>Expression</Text>
      <TextInput
        style={styles.editInput}
        value={expr}
        onChangeText={setExpr}
        placeholder="e.g. variables.myVar"
        placeholderTextColor="#333"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {varNames.length > 0 && (
        <View style={styles.typeRow}>
          {varNames.map((v) => (
            <Pressable key={v} style={styles.suggestionChip} onPress={() => setExpr(`variables.${v}`)}>
              <Text style={styles.suggestionText}>{v}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.editActions}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={() => { if (prop && expr) onSave(prop, expr); }}>
          <Text style={styles.saveLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Visibility Editor ---

function VisibilityEditor({
  current, varNames, onSave, onCancel,
}: {
  current?: string;
  varNames: string[];
  onSave: (expr: string | undefined) => void;
  onCancel: () => void;
}) {
  const [expr, setExpr] = useState(current ?? "");

  return (
    <View style={styles.editCard}>
      <TextInput
        style={styles.editInput}
        value={expr}
        onChangeText={setExpr}
        placeholder="e.g. variables.isLoggedIn"
        placeholderTextColor="#333"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {varNames.length > 0 && (
        <View style={styles.typeRow}>
          {varNames.map((v) => (
            <Pressable key={v} style={styles.suggestionChip} onPress={() => setExpr(`variables.${v}`)}>
              <Text style={styles.suggestionText}>{v}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.editActions}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={() => onSave(expr || undefined)}>
          <Text style={styles.saveLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Formatting helpers ---

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

// --- Styles ---

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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  scopeBtnActive: { backgroundColor: "#fff", borderColor: "#fff" },
  scopeLabel: { color: "#555", fontSize: 14, fontWeight: "600" },
  scopeLabelActive: { color: "#000" },
  sectionHeader: sharedMenuStyles.sectionHeader,
  emptyText: {
    color: "#444",
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
    borderBottomColor: "#1a1a1a",
  },
  varName: { color: "#ccc", fontSize: 16, fontWeight: "600", letterSpacing: 0.3 },
  varMeta: { color: "#444", fontSize: 12, marginTop: 2, fontVariant: ["tabular-nums"] },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: { color: "#dc2626", fontSize: 12, fontWeight: "700" },
  editCard: sharedMenuStyles.editCard,
  editInput: sharedMenuStyles.editInput,
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  typeChipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  typeChipText: { color: "#555", fontSize: 12, fontWeight: "600" },
  typeChipTextActive: { color: "#000" },
  persistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  persistLabel: { color: "#ccc", fontSize: 14 },
  editActions: sharedMenuStyles.editActions,
  cancelBtn: sharedMenuStyles.cancelBtn,
  cancelLabel: sharedMenuStyles.cancelLabel,
  saveBtn: sharedMenuStyles.saveBtn,
  saveLabel: sharedMenuStyles.saveLabel,
  addBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addBtnSmall: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addLabel: { color: "#555", fontSize: 14, fontWeight: "600", letterSpacing: 0.5 },

  // Logic-specific styles
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  badgeVis: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  badgeText: { color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  chevron: { color: "#333", fontSize: 24, fontWeight: "300" },
  chevronSmall: { color: "#444", fontSize: 14 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  backArrow: { color: "#666", fontSize: 24, fontWeight: "300" },
  backLabel: { color: "#666", fontSize: 14, fontWeight: "600", letterSpacing: 0.3 },
  detailTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "300",
    paddingHorizontal: 20,
    paddingBottom: 4,
    letterSpacing: 0.5,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  eventName: { color: "#ccc", fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
  eventRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: { color: "#000", fontSize: 11, fontWeight: "700" },
  eventBody: { paddingBottom: 8 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  actionDesc: { flex: 1, color: "#999", fontSize: 14 },
  bindingProp: { color: "#ccc", fontSize: 14, fontWeight: "600", letterSpacing: 0.3 },
  bindingExpr: { color: "#555", fontSize: 12, marginTop: 2, fontFamily: "monospace" },
  fieldLabel: {
    color: "#444",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  suggestionText: { color: "#666", fontSize: 12, fontWeight: "600" },
  visRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  visExpr: { flex: 1, color: "#ccc", fontSize: 14, fontWeight: "600", fontFamily: "monospace" },
  visAlways: { flex: 1, color: "#333", fontSize: 14, fontStyle: "italic" },
});
