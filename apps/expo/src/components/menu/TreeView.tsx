import React, { useRef, useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Platform, PanResponder, Animated, Dimensions } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Component } from "../../types";
import { flattenComponentTree, getComponentLabel } from "../../utils/componentTree";
import { usePagerScroll } from "../PagerScrollContext";

const ROW_HEIGHT = 44;

/* Lock swipe: press a lock icon and drag vertically to lock/unlock items in sequence */
function LockSwipe({
  flatIndex,
  isLocked,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
}: {
  flatIndex: number;
  isLocked: boolean;
  onSwipeStart: (fi: number) => void;
  onSwipeMove: (fi: number, dy: number) => void;
  onSwipeEnd: () => void;
}) {
  const { setGestureActive } = usePagerScroll();
  const fiRef = useRef(flatIndex);
  fiRef.current = flatIndex;
  const cbRef = useRef({ onSwipeStart, onSwipeMove, onSwipeEnd });
  cbRef.current = { onSwipeStart, onSwipeMove, onSwipeEnd };
  const setGestureActiveRef = useRef(setGestureActive);
  setGestureActiveRef.current = setGestureActive;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setGestureActiveRef.current(true);
        cbRef.current.onSwipeStart(fiRef.current);
      },
      onPanResponderMove: (_, g) => cbRef.current.onSwipeMove(fiRef.current, g.dy),
      onPanResponderRelease: () => {
        setGestureActiveRef.current(false);
        cbRef.current.onSwipeEnd();
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        setGestureActiveRef.current(false);
        cbRef.current.onSwipeEnd();
      },
    }),
  ).current;

  return (
    <View {...panResponder.panHandlers} style={styles.lockButton}>
      <Feather
        name={isLocked ? "lock" : "unlock"}
        size={14}
        color={isLocked ? "#666" : "#333"}
      />
    </View>
  );
}

/* Drag handle with PanResponder */
function DragHandle({
  flatIndex,
  onStart,
  onMove,
  onEnd,
}: {
  flatIndex: number;
  onStart: (fi: number) => void;
  onMove: (fi: number, dy: number, pageY: number) => void;
  onEnd: (fi: number) => void;
}) {
  const { setGestureActive } = usePagerScroll();
  const fiRef = useRef(flatIndex);
  fiRef.current = flatIndex;
  const cbRef = useRef({ onStart, onMove, onEnd });
  cbRef.current = { onStart, onMove, onEnd };
  const setGestureActiveRef = useRef(setGestureActive);
  setGestureActiveRef.current = setGestureActive;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setGestureActiveRef.current(true);
        cbRef.current.onStart(fiRef.current);
      },
      onPanResponderMove: (_, g) => cbRef.current.onMove(fiRef.current, g.dy, g.moveY),
      onPanResponderRelease: () => {
        setGestureActiveRef.current(false);
        cbRef.current.onEnd(fiRef.current);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        setGestureActiveRef.current(false);
        cbRef.current.onEnd(fiRef.current);
      },
    }),
  ).current;

  return (
    <View {...panResponder.panHandlers} style={styles.dragHandle}>
      <Feather name="more-vertical" size={14} color="#333" />
    </View>
  );
}

interface TreeViewProps {
  components: Component[];
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  lockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  onMoveComponent?: (componentId: string, toIndex: number, parentId: string | null) => void;
  onReparentComponent?: (componentId: string, newParentId: string | null) => void;
  onAIChatComponent?: (id: string) => void;
  selectedIds?: Set<string>;
  multiSelectMode?: boolean;
  onToggleMultiSelect?: (id: string) => void;
}

export function TreeView({
  components,
  onSelectComponent,
  onDeleteComponent,
  lockedIds,
  onToggleLock,
  onMoveComponent,
  onReparentComponent,
  onAIChatComponent,
  selectedIds,
  multiSelectMode,
  onToggleMultiSelect,
}: TreeViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const allNodes = useMemo(() => flattenComponentTree(components), [components]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filter out children of collapsed containers
  const nodes = useMemo(() => allNodes.filter((node) => {
    const parts = node.path.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      if (collapsedIds.has(parts[i])) return false;
    }
    return true;
  }), [allNodes, collapsedIds]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Lock-swipe state: tracks which action (lock/unlock) and which rows already toggled
  const lockSwipeAction = useRef<"lock" | "unlock" | null>(null);
  const lockSwipedIndices = useRef<Set<number>>(new Set());

  const onToggleLockRef = useRef(onToggleLock);
  onToggleLockRef.current = onToggleLock;
  const lockedIdsRef = useRef(lockedIds);
  lockedIdsRef.current = lockedIds;

  const startLockSwipe = useCallback((flatIndex: number) => {
    const node = nodesRef.current[flatIndex];
    if (!node) return;
    const wasLocked = lockedIdsRef.current?.has(node.component.id) ?? false;
    // The action is the opposite of current state: if unlocked, we lock; if locked, we unlock
    lockSwipeAction.current = wasLocked ? "unlock" : "lock";
    lockSwipedIndices.current = new Set([flatIndex]);
    onToggleLockRef.current?.(node.component.id);
  }, []);

  const moveLockSwipe = useCallback((startIndex: number, dy: number) => {
    const currentNodes = nodesRef.current;
    const targetIndex = Math.round(startIndex + dy / ROW_HEIGHT);
    if (targetIndex < 0 || targetIndex >= currentNodes.length) return;
    if (lockSwipedIndices.current.has(targetIndex)) return;

    const node = currentNodes[targetIndex];
    if (!node) return;
    const isCurrentlyLocked = lockedIdsRef.current?.has(node.component.id) ?? false;
    const action = lockSwipeAction.current;

    // Only toggle if the item doesn't already match our desired state
    if ((action === "lock" && !isCurrentlyLocked) || (action === "unlock" && isCurrentlyLocked)) {
      lockSwipedIndices.current.add(targetIndex);
      onToggleLockRef.current?.(node.component.id);
    }
  }, []);

  const endLockSwipe = useCallback(() => {
    lockSwipeAction.current = null;
    lockSwipedIndices.current.clear();
  }, []);

  const [dragFlatIndex, setDragFlatIndex] = useState<number | null>(null);
  const [hoverFlatIndex, setHoverFlatIndex] = useState<number | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<View>(null);
  const [trashTop, setTrashTop] = useState<number | null>(null);

  const onMoveRef = useRef(onMoveComponent);
  onMoveRef.current = onMoveComponent;
  const onReparentRef = useRef(onReparentComponent);
  onReparentRef.current = onReparentComponent;
  const onDeleteRef = useRef(onDeleteComponent);
  onDeleteRef.current = onDeleteComponent;
  const hoverRef = useRef<number | null>(null);
  const overTrashRef = useRef(false);

  const startDrag = useCallback(
    (flatIndex: number) => {
      setDragFlatIndex(flatIndex);
      hoverRef.current = null;
      setHoverFlatIndex(null);
      setDragOverTrash(false);
      overTrashRef.current = false;
      dragY.setValue(0);
      containerRef.current?.measureInWindow((_x, y) => {
        const screenH = Dimensions.get("window").height;
        setTrashTop(screenH - y - 70);
      });
    },
    [dragY],
  );

  const moveDrag = useCallback(
    (flatIndex: number, dy: number, pageY: number) => {
      dragY.setValue(dy);

      const screenHeight = Dimensions.get("window").height;
      const isOverTrash = pageY > screenHeight - 100;
      if (isOverTrash !== overTrashRef.current) {
        overTrashRef.current = isOverTrash;
        setDragOverTrash(isOverTrash);
      }

      if (isOverTrash) return;

      const currentNodes = nodesRef.current;
      const draggedNode = currentNodes[flatIndex];
      if (!draggedNode) return;

      // Find closest flat row based on visual position
      const targetFlatRow = Math.round(flatIndex + dy / ROW_HEIGHT);
      const clamped = Math.max(0, Math.min(targetFlatRow, currentNodes.length - 1));

      if (clamped !== flatIndex && hoverRef.current !== clamped) {
        hoverRef.current = clamped;
        setHoverFlatIndex(clamped);
      } else if (clamped === flatIndex && hoverRef.current !== null) {
        hoverRef.current = null;
        setHoverFlatIndex(null);
      }
    },
    [dragY],
  );

  const endDrag = useCallback(
    (flatIndex: number) => {
      if (overTrashRef.current) {
        const currentNodes = nodesRef.current;
        const draggedNode = currentNodes[flatIndex];
        if (draggedNode) {
          onDeleteRef.current(draggedNode.component.id);
        }
      } else {
        const currentNodes = nodesRef.current;
        const draggedNode = currentNodes[flatIndex];
        const targetFi = hoverRef.current;

        if (draggedNode && targetFi !== null) {
          const targetNode = currentNodes[targetFi];
          if (!targetNode) { /* no-op */ }
          else if (targetNode.parentId === draggedNode.parentId && targetNode.depth === draggedNode.depth) {
            // Same parent — reorder among siblings
            if (targetNode.indexInParent !== draggedNode.indexInParent) {
              onMoveRef.current?.(draggedNode.component.id, targetNode.indexInParent, draggedNode.parentId);
            }
          } else if (onReparentRef.current) {
            // Different parent — reparent to target's parent (or root)
            onReparentRef.current(draggedNode.component.id, targetNode.parentId);
          }
        }
      }

      setDragFlatIndex(null);
      setHoverFlatIndex(null);
      setDragOverTrash(false);
      setTrashTop(null);
      overTrashRef.current = false;
      hoverRef.current = null;
      dragY.setValue(0);
    },
    [dragY],
  );

  if (nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No components on canvas</Text>
      </View>
    );
  }

  return (
    <View ref={containerRef} style={styles.container}>
      {dragFlatIndex !== null && trashTop !== null && (
        <View style={[styles.trashZone, { top: trashTop }]}>
          <View style={[styles.trashPill, dragOverTrash && styles.trashPillActive]}>
            <Feather name="trash-2" size={18} color={dragOverTrash ? "#fff" : "rgba(255,255,255,0.6)"} />
          </View>
        </View>
      )}
      {nodes.map((node, i) => {
        const isDragged = dragFlatIndex === i;
        const isLocked = lockedIds?.has(node.component.id) ?? false;
        const isMultiSelected = selectedIds?.has(node.component.id) ?? false;

        // Show insertion indicator at the hovered flat position
        const showInsertBefore =
          dragFlatIndex !== null &&
          hoverFlatIndex === i &&
          dragFlatIndex !== i;

        return (
          <React.Fragment key={node.component.id}>
            {showInsertBefore && <View style={styles.insertionLine} />}
            <Animated.View
              style={
                isDragged
                  ? {
                      transform: [{ translateY: dragY }],
                      zIndex: 100,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderRadius: 8,
                    }
                  : undefined
              }
            >
              <View style={styles.rowOuter}>
                {onMoveComponent && (
                  <DragHandle
                    flatIndex={i}
                    onStart={startDrag}
                    onMove={moveDrag}
                    onEnd={endDrag}
                  />
                )}
                {onToggleLock && (
                  <LockSwipe
                    flatIndex={i}
                    isLocked={isLocked}
                    onSwipeStart={startLockSwipe}
                    onSwipeMove={moveLockSwipe}
                    onSwipeEnd={endLockSwipe}
                  />
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.treeRow,
                    { paddingLeft: !onMoveComponent && !onToggleLock ? 16 + node.depth * 24 : node.depth * 20 },
                    pressed && styles.treeRowPressed,
                    isLocked && styles.treeRowLocked,
                    isMultiSelected && styles.treeRowMultiSelected,
                  ]}
                  onPress={() => {
                    if (multiSelectMode && onToggleMultiSelect) {
                      onToggleMultiSelect(node.component.id);
                    } else {
                      onSelectComponent(node.component.id);
                    }
                  }}
                >
                  {node.component.type === "container" && (
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); toggleCollapse(node.component.id); }}
                      hitSlop={6}
                      style={styles.chevronButton}
                    >
                      <Feather
                        name={collapsedIds.has(node.component.id) ? "chevron-right" : "chevron-down"}
                        size={14}
                        color="#444"
                      />
                    </Pressable>
                  )}
                  {node.depth > 0 && node.component.type !== "container" && (
                    <View style={styles.leafIndent} />
                  )}
                  <Text style={[styles.label, isLocked && styles.dimmed]} numberOfLines={1}>
                    {getComponentLabel(node.component)}
                  </Text>
                  {node.component.type === "container" && node.component.children && node.component.children.length > 0 && (
                    <Text style={styles.childCount}>{node.component.children.length}</Text>
                  )}
                  <Text style={[styles.typeTag, isLocked && styles.dimmed]}>{node.component.type}</Text>
                  {onAIChatComponent && (
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); onAIChatComponent(node.component.id); }}
                      hitSlop={6}
                      style={styles.aiButton}
                    >
                      <MaterialCommunityIcons name="creation" size={14} color="#f5c542" />
                    </Pressable>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#333",
    fontSize: 14,
  },
  rowOuter: {
    flexDirection: "row",
    alignItems: "center",
  },
  dragHandle: {
    width: 28,
    height: ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  insertionLine: {
    height: 2,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 1,
  },
  treeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingRight: 16,
    gap: 10,
    backgroundColor: "transparent",
  },
  treeRowPressed: {
    backgroundColor: "#111",
  },
  treeRowLocked: {
    opacity: 0.5,
  },
  treeRowMultiSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  label: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  typeTag: {
    color: "#333",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 0.5,
  },
  dimmed: {
    opacity: 0.6,
  },
  lockButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  chevronButton: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 2,
  },
  leafIndent: {
    width: 22,
  },
  childCount: {
    color: "#444",
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: "#111",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
    marginLeft: 4,
  },
  aiButton: {
    padding: 4,
  },
  trashZone: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 200,
  },
  trashPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  trashPillActive: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
});
