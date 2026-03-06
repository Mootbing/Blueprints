import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import type { HistoryEntry } from "../../hooks/useUndoHistory";
import { ROOT_ID } from "../../hooks/useUndoHistory";
import type { Component } from "../../types";
import { rendererRegistry } from "../renderers";

// ─── Diff helpers ────────────────────────────────────────────────

interface DiffResult {
  added: Component[];
  removed: Component[];
  changed: { before: Component; after: Component }[];
  unchanged: Component[];
}

function flattenComponents(components: Component[]): Component[] {
  const result: Component[] = [];
  for (const c of components) {
    result.push(c);
    if (c.type === "container" && c.children)
      result.push(...flattenComponents(c.children));
  }
  return result;
}

function computeDiff(before: Component[], after: Component[]): DiffResult {
  const beforeFlat = flattenComponents(before);
  const afterFlat = flattenComponents(after);
  const beforeMap = new Map(beforeFlat.map((c) => [c.id, c]));
  const afterMap = new Map(afterFlat.map((c) => [c.id, c]));
  const added: Component[] = [];
  const removed: Component[] = [];
  const changed: { before: Component; after: Component }[] = [];
  const unchanged: Component[] = [];
  for (const [id, comp] of afterMap) {
    const prev = beforeMap.get(id);
    if (!prev) added.push(comp);
    else if (JSON.stringify(prev) !== JSON.stringify(comp))
      changed.push({ before: prev, after: comp });
    else unchanged.push(comp);
  }
  for (const [id, comp] of beforeMap) {
    if (!afterMap.has(id)) removed.push(comp);
  }
  return { added, removed, changed, unchanged };
}

// ─── Display list builder ────────────────────────────────────────

type ItemStatus = "head" | "active" | "future" | "branch";

interface DisplayItem {
  entry: HistoryEntry;
  status: ItemStatus;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  branchCount: number; // how many branches fork from this node
}

function buildDisplayList(
  entries: HistoryEntry[],
  currentId: string
): DisplayItem[] {
  const lookup = new Map<string, HistoryEntry>();
  const childrenMap = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    lookup.set(entry.id, entry);
    if (entry.parentId) {
      const siblings = childrenMap.get(entry.parentId) || [];
      siblings.push(entry);
      childrenMap.set(entry.parentId, siblings);
    }
  }

  // Active path root → HEAD
  const activePath: HistoryEntry[] = [];
  let cursor: string | undefined = currentId;
  while (cursor) {
    const entry = lookup.get(cursor);
    if (!entry) break;
    activePath.unshift(entry);
    if (entry.id === ROOT_ID || !entry.parentId) break;
    cursor = entry.parentId;
  }
  const activeIds = new Set(activePath.map((e) => e.id));

  function collectDescendants(id: string): HistoryEntry[] {
    const ch = childrenMap.get(id) || [];
    const r: HistoryEntry[] = [];
    for (const c of ch) {
      r.push(c);
      r.push(...collectDescendants(c.id));
    }
    return r;
  }

  const items: DisplayItem[] = [];

  // Future entries (descendants of HEAD)
  const future = collectDescendants(currentId);
  future.sort((a, b) => b.timestamp - a.timestamp);

  // Active path reversed (HEAD first)
  const reversed = [...activePath].reverse();

  // Combine: future → active (with branches inline)
  const allItems: { entry: HistoryEntry; status: ItemStatus; depth: number }[] =
    [];
  for (const fe of future)
    allItems.push({ entry: fe, status: "future", depth: 0 });
  for (const entry of reversed) {
    const isHead = entry.id === currentId;
    allItems.push({ entry, status: isHead ? "head" : "active", depth: 0 });
    if (!isHead) {
      const ch = childrenMap.get(entry.id) || [];
      const branches = ch.filter((c) => !activeIds.has(c.id));
      for (const b of branches) {
        const be = [b, ...collectDescendants(b.id)];
        be.sort((a, b2) => b2.timestamp - a.timestamp);
        for (const x of be)
          allItems.push({ entry: x, status: "branch", depth: 1 });
      }
    }
  }

  for (let i = 0; i < allItems.length; i++) {
    const it = allItems[i];
    const ch = childrenMap.get(it.entry.id) || [];
    const branchCount = ch.filter((c) => !activeIds.has(c.id)).length;
    items.push({
      ...it,
      isFirst: i === 0,
      isLast: i === allItems.length - 1,
      branchCount: it.status === "head" || it.status === "active" ? branchCount : 0,
    });
  }
  return items;
}

// ─── Timestamp ───────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  const d = new Date(ts);
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

// ─── Preview component renderer ──────────────────────────────────

function PreviewComponent({
  component,
  canvasWidth,
  canvasHeight,
  highlight,
}: {
  component: Component;
  canvasWidth: number;
  canvasHeight: number;
  highlight?: "added" | "removed" | "changed-old" | "changed-new";
}) {
  const Renderer = rendererRegistry[component.type];
  if (!Renderer) return null;

  const left = component.layout.x * canvasWidth;
  const top = component.layout.y * canvasHeight;
  const width = component.layout.width * canvasWidth;
  const height = component.layout.height * canvasHeight;
  const rotation = component.layout.rotation ?? 0;

  const borderColor = highlight === "removed" || highlight === "changed-old"
    ? "#ef4444"
    : highlight === "added" || highlight === "changed-new"
    ? "#22c55e"
    : "transparent";
  const borderWidth = highlight ? 2 : 0;
  const bgOverlay = highlight === "removed" || highlight === "changed-old"
    ? "rgba(239,68,68,0.1)"
    : highlight === "added" || highlight === "changed-new"
    ? "rgba(34,197,94,0.1)"
    : "transparent";

  return (
    <View
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        transform: rotation ? [{ rotate: `${rotation}rad` }] : [],
        borderWidth,
        borderColor,
        borderRadius: 4,
        backgroundColor: bgOverlay,
        opacity: highlight === "removed" || highlight === "changed-old" ? 0.6 : 1,
      }}
      pointerEvents="none"
    >
      <Renderer component={component} isEditMode={false} />
      {highlight && (
        <View style={{
          position: "absolute",
          top: -10,
          right: -2,
          backgroundColor: borderColor,
          borderRadius: 3,
          paddingHorizontal: 4,
          paddingVertical: 1,
        }}>
          <Text style={{ color: "#fff", fontSize: 7, fontWeight: "800" }}>
            {highlight === "removed" ? "OLD" : highlight === "added" ? "NEW" : highlight === "changed-old" ? "OLD" : "NEW"}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Detail panel (bottom sheet with diff) ───────────────────────

function DetailPanel({
  entry,
  currentEntry,
  screenId,
  onRestore,
  onClose,
  isHead,
}: {
  entry: HistoryEntry;
  currentEntry: HistoryEntry;
  screenId: string;
  onRestore: () => void;
  onClose: () => void;
  isHead: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  // Compare current HEAD state to the selected entry (what would change on restore)
  const currentScreen = currentEntry.slate.screens[screenId];
  const selectedScreen = entry.slate.screens[screenId];
  const diff = useMemo(() => {
    if (!currentScreen || !selectedScreen) return null;
    return computeDiff(currentScreen.components, selectedScreen.components);
  }, [currentScreen, selectedScreen]);

  const isRoot = entry.id === ROOT_ID;
  const d = new Date(entry.timestamp);
  const fullTime = `${d.getHours() % 12 || 12}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;

  // Preview canvas dimensions (scaled to fit with padding)
  const previewPadding = 16;
  const previewWidth = screenWidth - previewPadding * 2;
  const previewAspect = 1.6; // approximate phone aspect ratio
  const previewHeight = previewWidth * previewAspect;

  if (previewOpen && diff && selectedScreen) {
    // Full-screen preview mode
    return (
      <View style={[StyleSheet.absoluteFill, dp.previewOverlay]}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Preview header */}
          <View style={dp.previewHeader}>
            <Text style={dp.previewTitle}>
              {isRoot ? "Initial state" : entry.description}
            </Text>
            <Pressable onPress={() => setPreviewOpen(false)} hitSlop={12}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Diff summary */}
          <View style={dp.previewChips}>
            {diff.added.length > 0 && (
              <View style={[dp.previewChip, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                <Text style={[dp.previewChipText, { color: "#22c55e" }]}>
                  +{diff.added.length} added
                </Text>
              </View>
            )}
            {diff.removed.length > 0 && (
              <View style={[dp.previewChip, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                <Text style={[dp.previewChipText, { color: "#ef4444" }]}>
                  -{diff.removed.length} removed
                </Text>
              </View>
            )}
            {diff.changed.length > 0 && (
              <View style={[dp.previewChip, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                <Text style={[dp.previewChipText, { color: "#f59e0b" }]}>
                  ~{diff.changed.length} changed
                </Text>
              </View>
            )}
          </View>

          {/* Legend */}
          <View style={dp.previewLegend}>
            <View style={dp.legendItem}>
              <View style={[dp.legendDot, { backgroundColor: "#ef4444" }]} />
              <Text style={dp.legendLabel}>Old / Removed</Text>
            </View>
            <View style={dp.legendItem}>
              <View style={[dp.legendDot, { backgroundColor: "#22c55e" }]} />
              <Text style={dp.legendLabel}>New / Added</Text>
            </View>
          </View>

          {/* Preview canvas */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[dp.previewCanvas, { width: previewWidth, height: previewHeight }]}>
              {/* Render unchanged components normally */}
              {diff.unchanged.map((comp) => (
                <PreviewComponent
                  key={comp.id}
                  component={comp}
                  canvasWidth={previewWidth}
                  canvasHeight={previewHeight}
                />
              ))}
              {/* Render removed components with red highlight */}
              {diff.removed.map((comp) => (
                <PreviewComponent
                  key={comp.id + "_removed"}
                  component={comp}
                  canvasWidth={previewWidth}
                  canvasHeight={previewHeight}
                  highlight="removed"
                />
              ))}
              {/* Render added components with green highlight */}
              {diff.added.map((comp) => (
                <PreviewComponent
                  key={comp.id + "_added"}
                  component={comp}
                  canvasWidth={previewWidth}
                  canvasHeight={previewHeight}
                  highlight="added"
                />
              ))}
              {/* Render changed: old (red) and new (green) side by side */}
              {diff.changed.map(({ before, after }) => (
                <React.Fragment key={before.id + "_changed"}>
                  <PreviewComponent
                    component={before}
                    canvasWidth={previewWidth}
                    canvasHeight={previewHeight}
                    highlight="changed-old"
                  />
                  <PreviewComponent
                    component={after}
                    canvasWidth={previewWidth}
                    canvasHeight={previewHeight}
                    highlight="changed-new"
                  />
                </React.Fragment>
              ))}
            </View>
          </ScrollView>

          {/* Restore button at bottom */}
          {!isHead && (
            <View style={dp.previewFooter}>
              <Pressable
                style={({ pressed }) => [dp.restoreBtn, pressed && dp.restoreBtnPressed]}
                onPress={onRestore}
              >
                <Feather name="rotate-ccw" size={16} color="#fff" />
                <Text style={dp.restoreBtnText}>Restore to this point</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={dp.container}>
      {/* Handle bar */}
      <View style={dp.handleBar} />

      {/* Header */}
      <View style={dp.header}>
        <View style={dp.headerLeft}>
          <Text style={dp.title} numberOfLines={1}>
            {isRoot ? "Initial state" : entry.description}
          </Text>
          <Text style={dp.subtitle}>{fullTime}</Text>
        </View>
        <View style={dp.headerActions}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
      </View>

      {/* Diff summary */}
      {diff && (
        <View style={dp.chips}>
          {diff.added.length > 0 && (
            <View style={[dp.chip, { borderColor: "rgba(34,197,94,0.4)" }]}>
              <Text style={[dp.chipText, { color: "#22c55e" }]}>
                +{diff.added.length} added
              </Text>
            </View>
          )}
          {diff.removed.length > 0 && (
            <View style={[dp.chip, { borderColor: "rgba(239,68,68,0.4)" }]}>
              <Text style={[dp.chipText, { color: "#ef4444" }]}>
                -{diff.removed.length} removed
              </Text>
            </View>
          )}
          {diff.changed.length > 0 && (
            <View style={[dp.chip, { borderColor: "rgba(245,158,11,0.4)" }]}>
              <Text style={[dp.chipText, { color: "#f59e0b" }]}>
                ~{diff.changed.length} changed
              </Text>
            </View>
          )}
          {diff.added.length === 0 &&
            diff.removed.length === 0 &&
            diff.changed.length === 0 && (
              <Text style={dp.noChanges}>No component changes</Text>
            )}
        </View>
      )}

      {/* Preview changes button */}
      {diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0) && (
        <Pressable
          style={({ pressed }) => [dp.previewBtn, pressed && dp.previewBtnPressed]}
          onPress={() => setPreviewOpen(true)}
        >
          <Feather name="eye" size={16} color="#ccc" />
          <Text style={dp.previewBtnText}>Preview changes</Text>
        </Pressable>
      )}

      {/* Restore button */}
      {!isHead && (
        <Pressable
          style={({ pressed }) => [dp.restoreBtn, pressed && dp.restoreBtnPressed]}
          onPress={onRestore}
        >
          <Feather name="rotate-ccw" size={16} color="#fff" />
          <Text style={dp.restoreBtnText}>Restore to this point</Text>
        </Pressable>
      )}
      {isHead && (
        <View style={dp.currentBadge}>
          <Feather name="check-circle" size={14} color="#555" />
          <Text style={dp.currentBadgeText}>This is the current state</Text>
        </View>
      )}
    </View>
  );
}

const dp = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.97)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    zIndex: 10,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 17, fontWeight: "300", letterSpacing: 0.5 },
  subtitle: {
    color: "#444",
    fontSize: 12,
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  noChanges: { color: "#333", fontSize: 12 },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  previewBtnPressed: { backgroundColor: "#333" },
  previewBtnText: { color: "#ccc", fontSize: 15, fontWeight: "700" },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
  },
  restoreBtnPressed: { backgroundColor: "#ccc" },
  restoreBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  currentBadgeText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
  // Preview mode styles
  previewOverlay: {
    backgroundColor: "rgba(0,0,0,0.98)",
    zIndex: 20,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  previewChips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  previewChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewChipText: { fontSize: 11, fontWeight: "600" },
  previewLegend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    color: "#444",
    fontSize: 11,
    fontWeight: "500",
  },
  previewCanvas: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
});

// ─── Timeline row ────────────────────────────────────────────────

function TimelineRow({
  item,
  isSelected,
  onSelect,
}: {
  item: DisplayItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isHead = item.status === "head";
  const isFuture = item.status === "future";
  const isBranch = item.status === "branch";
  const isRoot = item.entry.id === ROOT_ID;

  // Dot style
  const dotSize = isHead ? 14 : isBranch ? 8 : 10;
  const dotColor = isHead
    ? "#fff"
    : isFuture
    ? "#1a1a1a"
    : isBranch
    ? "#f59e0b"
    : isSelected
    ? "#fff"
    : "#333";
  const dotBorder =
    isFuture || isRoot
      ? { borderWidth: 2, borderColor: dotColor, backgroundColor: "transparent" }
      : { backgroundColor: dotColor };

  // Line color
  const lineColor = isFuture
    ? "#111"
    : isBranch
    ? "rgba(245,158,11,0.2)"
    : "#1a1a1a";

  return (
    <Pressable
      style={({ pressed }) => [
        tl.row,
        { paddingLeft: 12 + item.depth * 28 },
        isSelected && tl.rowSelected,
        pressed && !isSelected && tl.rowPressed,
      ]}
      onPress={onSelect}
    >
      {/* Gutter: line + dot */}
      <View style={tl.gutter}>
        {!item.isFirst && (
          <View style={[tl.lineTop, { backgroundColor: lineColor }]} />
        )}
        <View
          style={[
            tl.dot,
            { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
            dotBorder,
          ]}
        />
        {!item.isLast && (
          <View style={[tl.lineBottom, { backgroundColor: lineColor }]} />
        )}
      </View>

      {/* Content */}
      <View style={tl.content}>
        <View style={tl.labelRow}>
          <Text
            style={[
              tl.label,
              isFuture && tl.labelFuture,
              isBranch && tl.labelBranch,
              isHead && tl.labelHead,
              isSelected && !isHead && tl.labelSelected,
            ]}
            numberOfLines={1}
          >
            {isRoot ? "Initial state" : item.entry.description}
          </Text>
          {isHead && (
            <View style={tl.headBadge}>
              <Text style={tl.headBadgeText}>HEAD</Text>
            </View>
          )}
          {item.branchCount > 0 && (
            <View style={tl.branchBadge}>
              <Feather name="git-branch" size={10} color="#f59e0b" />
              <Text style={tl.branchBadgeText}>{item.branchCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            tl.time,
            isFuture && tl.timeFuture,
            isBranch && tl.timeBranch,
          ]}
        >
          {isHead ? "current" : formatTime(item.entry.timestamp)}
        </Text>
      </View>

      {/* Selection indicator */}
      {isSelected && <View style={tl.selectBar} />}
    </Pressable>
  );
}

const tl = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    minHeight: 48,
  },
  rowSelected: {
    backgroundColor: "#0a0a0a",
  },
  rowPressed: {
    backgroundColor: "#0a0a0a",
  },
  gutter: {
    width: 32,
    alignItems: "center",
    alignSelf: "stretch",
    position: "relative",
  },
  lineTop: {
    position: "absolute",
    top: 0,
    width: 2,
    height: "50%",
    borderRadius: 1,
  },
  lineBottom: {
    position: "absolute",
    bottom: 0,
    width: 2,
    height: "50%",
    borderRadius: 1,
  },
  dot: {
    position: "absolute",
    top: "50%",
    marginTop: -5,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  labelFuture: { color: "#333" },
  labelBranch: { color: "#444" },
  labelHead: { color: "#fff", fontWeight: "700" },
  labelSelected: { color: "#fff" },
  headBadge: {
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  headBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  branchBadgeText: {
    color: "#f59e0b",
    fontSize: 9,
    fontWeight: "700",
  },
  time: {
    color: "#333",
    fontSize: 11,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  timeFuture: { color: "#222" },
  timeBranch: { color: "#333" },
  selectBar: {
    position: "absolute",
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "#fff",
  },
});

// ─── Main modal ──────────────────────────────────────────────────

interface VersionHistoryModalProps {
  visible: boolean;
  entries: HistoryEntry[];
  currentId: string;
  onRestore: (id: string) => void;
  onClose: () => void;
}

export function VersionHistoryModal({
  visible,
  entries,
  currentId,
  onRestore,
  onClose,
}: VersionHistoryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const displayItems = useMemo(
    () => buildDisplayList(entries, currentId),
    [entries, currentId]
  );

  const selectedEntry = selectedId
    ? entries.find((e) => e.id === selectedId)
    : null;

  const currentEntry = entries.find((e) => e.id === currentId);

  const handleRestore = useCallback(() => {
    if (!selectedId) return;
    onRestore(selectedId);
    setSelectedId(null);
  }, [selectedId, onRestore]);

  if (!visible) return null;

  const hasHistory = displayItems.length > 1;

  return (
    <View style={[StyleSheet.absoluteFill, s.overlay]}>
      <Pressable
        style={[StyleSheet.absoluteFill, s.overlayBg]}
        onPress={onClose}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <SafeAreaView style={s.sheet} pointerEvents="box-none">
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={onClose}>
            <Feather name="chevron-left" size={22} color="#fff" />
            <Text style={s.title}>History</Text>
          </Pressable>
        </View>

        {!hasHistory && (
          <View style={s.emptyContainer}>
            <Feather
              name="clock"
              size={32}
              color="rgba(255,255,255,0.15)"
            />
            <Text style={s.emptyTitle}>No history yet</Text>
            <Text style={s.emptySubtitle}>
              Your changes will appear here as you edit
            </Text>
          </View>
        )}

        {hasHistory && (
          <ScrollView
            style={[s.scrollView, selectedEntry && { marginBottom: 280 }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {displayItems.map((item, i) => (
              <TimelineRow
                key={item.entry.id + "-" + i}
                item={item}
                isSelected={selectedId === item.entry.id}
                onSelect={() =>
                  setSelectedId(
                    selectedId === item.entry.id ? null : item.entry.id
                  )
                }
              />
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}

        {/* Detail panel */}
        {selectedEntry && currentEntry && (
          <DetailPanel
            entry={selectedEntry}
            currentEntry={currentEntry}
            screenId={selectedEntry.slate.initial_screen_id}
            onRestore={handleRestore}
            onClose={() => setSelectedId(null)}
            isHead={selectedId === currentId}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBg: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: "#444",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 4,
  },
  emptySubtitle: {
    color: "#333",
    fontSize: 13,
  },
});
