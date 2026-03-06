import React, { useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform, PanResponder, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Component } from "../../types";
import { flattenComponentTree, getComponentLabel } from "../../utils/componentTree";

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
  const fiRef = useRef(flatIndex);
  fiRef.current = flatIndex;
  const cbRef = useRef({ onSwipeStart, onSwipeMove, onSwipeEnd });
  cbRef.current = { onSwipeStart, onSwipeMove, onSwipeEnd };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => cbRef.current.onSwipeStart(fiRef.current),
      onPanResponderMove: (_, g) => cbRef.current.onSwipeMove(fiRef.current, g.dy),
      onPanResponderRelease: () => cbRef.current.onSwipeEnd(),
      onPanResponderTerminate: () => cbRef.current.onSwipeEnd(),
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
  onMove: (fi: number, dy: number) => void;
  onEnd: (fi: number) => void;
}) {
  const fiRef = useRef(flatIndex);
  fiRef.current = flatIndex;
  const cbRef = useRef({ onStart, onMove, onEnd });
  cbRef.current = { onStart, onMove, onEnd };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => cbRef.current.onStart(fiRef.current),
      onPanResponderMove: (_, g) => cbRef.current.onMove(fiRef.current, g.dy),
      onPanResponderRelease: () => cbRef.current.onEnd(fiRef.current),
      onPanResponderTerminate: () => cbRef.current.onEnd(fiRef.current),
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
}

export function TreeView({
  components,
  onSelectComponent,
  onDeleteComponent,
  lockedIds,
  onToggleLock,
  onMoveComponent,
}: TreeViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const allNodes = flattenComponentTree(components);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filter out children of collapsed containers
  const nodes = allNodes.filter((node) => {
    const parts = node.path.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      if (collapsedIds.has(parts[i])) return false;
    }
    return true;
  });

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
  const [hoverSiblingIdx, setHoverSiblingIdx] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;

  const onMoveRef = useRef(onMoveComponent);
  onMoveRef.current = onMoveComponent;
  const hoverRef = useRef<number | null>(null);

  const startDrag = useCallback(
    (flatIndex: number) => {
      setDragFlatIndex(flatIndex);
      hoverRef.current = null;
      setHoverSiblingIdx(null);
      dragY.setValue(0);
    },
    [dragY],
  );

  const moveDrag = useCallback(
    (flatIndex: number, dy: number) => {
      dragY.setValue(dy);

      const currentNodes = nodesRef.current;
      const draggedNode = currentNodes[flatIndex];
      if (!draggedNode) return;

      // Get sibling entries (same parent, same depth)
      const siblingEntries = currentNodes
        .map((n, i) => ({ node: n, fi: i }))
        .filter(({ node }) => node.parentId === draggedNode.parentId && node.depth === draggedNode.depth);

      // Find which sibling we're closest to based on visual row position
      const targetFlatRow = flatIndex + dy / ROW_HEIGHT;
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < siblingEntries.length; i++) {
        const dist = Math.abs(siblingEntries[i].fi - targetFlatRow);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      const targetSibIdx = siblingEntries[closestIdx].node.indexInParent;
      if (hoverRef.current !== targetSibIdx) {
        hoverRef.current = targetSibIdx;
        setHoverSiblingIdx(targetSibIdx);
      }
    },
    [dragY],
  );

  const endDrag = useCallback(
    (flatIndex: number) => {
      const currentNodes = nodesRef.current;
      const draggedNode = currentNodes[flatIndex];
      const targetIdx = hoverRef.current;

      if (
        draggedNode &&
        targetIdx !== null &&
        targetIdx !== draggedNode.indexInParent
      ) {
        onMoveRef.current?.(draggedNode.component.id, targetIdx, draggedNode.parentId);
      }

      setDragFlatIndex(null);
      setHoverSiblingIdx(null);
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
    <View style={styles.container}>
      {nodes.map((node, i) => {
        const isDragged = dragFlatIndex === i;
        const isLocked = lockedIds?.has(node.component.id) ?? false;

        // Show insertion indicator when hovering at a sibling position
        const draggedNode = dragFlatIndex !== null ? nodes[dragFlatIndex] : null;
        const isSameGroup =
          draggedNode &&
          node.parentId === draggedNode.parentId &&
          node.depth === draggedNode.depth;
        const showInsertBefore =
          isSameGroup &&
          hoverSiblingIdx === node.indexInParent &&
          dragFlatIndex !== i &&
          hoverSiblingIdx !== draggedNode!.indexInParent;

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
                  ]}
                  onPress={() => onSelectComponent(node.component.id)}
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
});
