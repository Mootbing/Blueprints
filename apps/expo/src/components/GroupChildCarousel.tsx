import React, { useState, useCallback, useRef, useMemo } from "react";
import { View, FlatList, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Component } from "../types";
import { rendererRegistry } from "./renderers";
import type { TextEditingState } from "./TextEditorModal";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";

const ADD_PAGE_ID = "__add_page__";
type CarouselItem = Component | { id: typeof ADD_PAGE_ID };

interface GroupChildCarouselProps {
  childComponents: Component[];
  canvasWidth: number;
  canvasHeight: number;
  editingComponentId: string | null;
  editState: TextEditingState | null;
  onChildSelect: (id: string) => void;
  onChildEditStart: (componentId: string, initialState: TextEditingState) => void;
  onChildEditStateChange: (updates: Partial<TextEditingState>) => void;
  onDrillInto: (id: string) => void;
  onChildStyleSelect: (componentId: string) => void;
  onChildPickImage?: (componentId: string) => void;
  onEditDone: () => void;
  onLongPress?: () => void;
}

function getChildLabel(child: Component): string {
  if (child.type === "text") return child.content?.slice(0, 24) || "Text";
  if (child.type === "button") return child.label?.slice(0, 24) || "Button";
  if (child.type === "container") return "Group";
  return child.type.charAt(0).toUpperCase() + child.type.slice(1);
}

export function GroupChildCarousel({
  childComponents,
  canvasWidth,
  canvasHeight,
  editingComponentId,
  editState,
  onChildSelect,
  onChildEditStart,
  onChildEditStateChange,
  onDrillInto,
  onChildStyleSelect,
  onChildPickImage,
  onEditDone,
  onLongPress,
}: GroupChildCarouselProps) {
  const keyboardHeight = useKeyboardHeight();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isEditing = editingComponentId != null;
  const pageWidth = canvasWidth;
  const visibleHeight = canvasHeight - keyboardHeight;

  // Append an "add" page at the end when there are children
  const carouselData: CarouselItem[] = useMemo(
    () =>
      childComponents.length > 0
        ? [...childComponents, { id: ADD_PAGE_ID }]
        : [{ id: ADD_PAGE_ID }],
    [childComponents]
  );
  const totalPages = carouselData.length;

  const handlePageChange = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      setCurrentIndex(Math.max(0, Math.min(index, totalPages - 1)));
    },
    [pageWidth, totalPages]
  );

  const handleChildTap = useCallback(
    (child: Component) => {
      onChildSelect(child.id);
      if (child.type === "text" || child.type === "button") {
        const isButton = child.type === "button";
        const fw = child.fontWeight;
        const initialState: TextEditingState = {
          text: isButton ? (child.label ?? "Button") : (child.content ?? ""),
          fontSize: child.fontSize ?? 16,
          color: isButton ? (child.textColor ?? "#ffffff") : (child.color ?? "#1a1a1a"),
          backgroundColor: isButton
            ? (child.backgroundColor ?? "#6366f1")
            : (child.backgroundColor ?? "transparent"),
          fontFamily: child.fontFamily ?? "System",
          fontWeight: fw === "normal" || fw === "bold" ? fw : "normal",
          textAlign: child.textAlign ?? "left",
          wrapMode:
            !isButton && "wrapMode" in child && child.wrapMode
              ? child.wrapMode
              : "wrap-word",
          fontStyle: "normal",
          textDecorationLine: "none",
        };
        onChildEditStart(child.id, initialState);
      } else if (child.type === "container") {
        onDrillInto(child.id);
      } else if (child.type === "image") {
        onChildPickImage?.(child.id);
      } else {
        onChildStyleSelect(child.id);
      }
    },
    [onChildSelect, onChildEditStart, onDrillInto, onChildStyleSelect, onChildPickImage]
  );

  const handleBackgroundTap = useCallback(() => {
    if (isEditing) {
      onEditDone();
    }
  }, [isEditing, onEditDone]);

  const noop = useCallback(() => {}, []);

  const renderItem = useCallback(
    ({ item }: { item: CarouselItem }) => {
      // Add-page sentinel
      if (item.id === ADD_PAGE_ID) {
        return (
          <Pressable
            style={[styles.page, { width: pageWidth, height: canvasHeight }]}
            onLongPress={onLongPress}
            delayLongPress={500}
          >
            <View
              style={{
                height: visibleHeight,
                paddingTop: 90,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View style={styles.addCard}>
                <Feather name="plus" size={32} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={styles.childLabel}>Add Component</Text>
              <Text style={styles.tapHint}>Long press to add</Text>
            </View>
          </Pressable>
        );
      }

      const child = item as Component;
      const Renderer = rendererRegistry[child.type];
      if (!Renderer) return <View style={{ width: pageWidth }} />;

      const isChildEditing = editingComponentId === child.id;

      // Calculate display size: scale child's aspect ratio to fit nicely
      const childAspect =
        child.layout.width / Math.max(child.layout.height, 0.01);
      const maxW = canvasWidth * 0.85;
      const maxH = visibleHeight * 0.4;
      let displayW: number;
      let displayH: number;
      if (childAspect >= maxW / maxH) {
        displayW = maxW;
        displayH = maxW / childAspect;
      } else {
        displayH = maxH;
        displayW = maxH * childAspect;
      }
      displayW = Math.max(displayW, 120);
      displayH = Math.max(displayH, 60);

      // Build renderer props
      let rendererProps: Record<string, unknown> = {
        component: child,
        isEditMode: true,
      };

      if (child.type === "text" || child.type === "button") {
        rendererProps = {
          ...rendererProps,
          editTapFired: false,
          consumeEditTap: noop,
          editState: isChildEditing ? editState : null,
          onEditStart: (initialState: TextEditingState) =>
            onChildEditStart(child.id, initialState),
          onEditStateChange: onChildEditStateChange,
        };
      }

      const cardContent = (
        <View
          style={[
            styles.childCard,
            { width: displayW, height: displayH },
            isChildEditing && styles.childCardEditing,
          ]}
        >
          <Renderer {...rendererProps} />
        </View>
      );

      return (
        <Pressable
          style={[styles.page, { width: pageWidth, height: canvasHeight }]}
          onPress={handleBackgroundTap}
          onLongPress={onLongPress}
          delayLongPress={500}
        >
          <View
            style={{
              height: visibleHeight,
              paddingTop: 90,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isChildEditing ? (
              cardContent
            ) : (
              <Pressable onPress={() => handleChildTap(child)}>
                {cardContent}
              </Pressable>
            )}
            {!isEditing && (
              <>
                <Text style={styles.childLabel} numberOfLines={1}>
                  {getChildLabel(child)}
                </Text>
                <Text style={styles.tapHint}>Tap to edit</Text>
              </>
            )}
          </View>
        </Pressable>
      );
    },
    [
      pageWidth,
      canvasHeight,
      visibleHeight,
      canvasWidth,
      editingComponentId,
      editState,
      isEditing,
      onChildEditStart,
      onChildEditStateChange,
      handleChildTap,
      handleBackgroundTap,
      onLongPress,
      noop,
    ]
  );

  return (
    <View
      style={[styles.overlay, { width: canvasWidth, height: canvasHeight }]}
    >
      <FlatList
        ref={flatListRef}
        data={carouselData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isEditing}
        onMomentumScrollEnd={handlePageChange}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        extraData={editingComponentId}
      />
      {/* Page dots */}
      {totalPages > 1 && !isEditing && (
        <View
          style={[
            styles.dotsContainer,
            { bottom: canvasHeight - visibleHeight + 40 },
          ]}
          pointerEvents="none"
        >
          {carouselData.map((item, index) => (
            <View
              key={item.id}
              style={[
                item.id === ADD_PAGE_ID ? styles.dotAdd : styles.dot,
                index === currentIndex && (item.id === ADD_PAGE_ID ? styles.dotAddActive : styles.dotActive),
              ]}
            />
          ))}
        </View>
      )}
      {/* Counter */}
      {totalPages > 1 && !isEditing && (
        <View
          style={[
            styles.counter,
            { bottom: canvasHeight - visibleHeight + 24 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.counterText}>
            {currentIndex < childComponents.length
              ? `${currentIndex + 1} / ${childComponents.length}`
              : "+"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 60,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  page: {
    justifyContent: "center",
    alignItems: "center",
  },
  childCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  childCardEditing: {
    borderColor: "#818cf8",
    borderWidth: 2,
  },
  addCard: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  childLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  tapHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  dotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#818cf8",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotAdd: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
  },
  dotAddActive: {
    borderColor: "#818cf8",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  counterText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
});
