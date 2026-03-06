import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import type { ContainerComponent, Layout } from "../../types";
import type { TextEditingState } from "../EditorToolbar";
import { rendererRegistry } from "./index";
import { GroupChildComponent } from "../GroupChildComponent";
import { GradientOverlay } from "../GradientOverlay";

export interface ContainerRendererProps {
  component: ContainerComponent;
  isEditMode?: boolean;
  renderChild?: (child: any) => React.ReactNode;
  // Drill-in props
  isDrilledInto?: boolean;
  selectedChildId?: string | null;
  editingComponentId?: string | null;
  editState?: TextEditingState | null;
  onChildSelect?: (id: string) => void;
  onChildUpdate?: (id: string, layout: Layout) => void;
  onChildEditStart?: (componentId: string, initialState: TextEditingState) => void;
  onChildEditStateChange?: (updates: Partial<TextEditingState>) => void;
  onDrillInto?: (id: string) => void;
  onChildStyleSelect?: (componentId: string) => void;
  onChildPickImage?: (componentId: string) => void;
}

export const ContainerRenderer = React.memo(function ContainerRenderer({
  component,
  isEditMode,
  renderChild,
  isDrilledInto,
  selectedChildId,
  editingComponentId,
  editState,
  onChildSelect,
  onChildUpdate,
  onChildEditStart,
  onChildEditStateChange,
  onDrillInto,
  onChildStyleSelect,
  onChildPickImage,
}: ContainerRendererProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const backgroundColor = component.backgroundColor ?? "transparent";
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth ?? 0;
  const borderRadius = component.borderRadius ?? 12;
  const padding = component.padding ?? 0;
  const shadowEnabled = component.shadowEnabled ?? false;
  const isFlexLayout = component.layoutMode === "flex";
  const scrollable = component.scrollable ?? false;
  const scrollDirection = component.scrollDirection ?? "vertical";
  const gradientEnabled = component.gradientEnabled ?? false;
  const gradientColors = component.gradientColors;

  const renderChildren = () =>
    component.children?.map((child) => {
      if (renderChild) return renderChild(child);

      // Drill-in mode: wrap children in GroupChildComponent for interactive editing
      if (isDrilledInto && containerSize.width > 0 && onChildSelect && onChildUpdate && onChildEditStart && onDrillInto && onChildStyleSelect) {
        return (
          <GroupChildComponent
            key={child.id}
            component={child}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            isSelected={selectedChildId === child.id}
            isEditMode={isEditMode ?? false}
            editingComponentId={editingComponentId ?? null}
            editState={editingComponentId === child.id ? (editState ?? null) : null}
            onSelect={onChildSelect}
            onUpdate={onChildUpdate}
            onEditStart={onChildEditStart}
            onEditStateChange={onChildEditStateChange}
            onDrillInto={onDrillInto}
            onStyleSelect={onChildStyleSelect}
            onPickImage={onChildPickImage}
          />
        );
      }

      // Default rendering
      if (containerSize.width > 0) {
        const ChildRenderer = rendererRegistry[child.type];
        if (!ChildRenderer) return null;

        if (isFlexLayout) {
          const width = child.layout.width * containerSize.width;
          const height = child.layout.height * containerSize.height;
          return (
            <View key={child.id} style={{ width, height }}>
              <ChildRenderer component={child} isEditMode={false} />
            </View>
          );
        }

        // Absolute layout
        const left = child.layout.x * containerSize.width;
        const top = child.layout.y * containerSize.height;
        const width = child.layout.width * containerSize.width;
        const height = child.layout.height * containerSize.height;
        return (
          <View
            key={child.id}
            style={{ position: "absolute", left, top, width, height }}
          >
            <ChildRenderer component={child} isEditMode={false} />
          </View>
        );
      }

      return null;
    });

  const useScroll = scrollable && !isEditMode;

  const content = useScroll ? (
    <ScrollView
      nestedScrollEnabled
      horizontal={scrollDirection === "horizontal"}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      {renderChildren()}
    </ScrollView>
  ) : (
    renderChildren()
  );

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        borderWidth,
        borderColor: borderColor ?? "transparent",
        padding,
        paddingHorizontal: component.paddingHorizontal,
        paddingVertical: component.paddingVertical,
        opacity: component.opacity ?? 1,
        overflow: "hidden",
        ...(isFlexLayout
          ? {
              flexDirection: component.flexDirection ?? "column",
              gap: component.gap ?? 0,
              justifyContent: component.justifyContent ?? "flex-start",
              alignItems: component.alignItems ?? "stretch",
              flexWrap: component.flexWrap ?? "nowrap",
            }
          : {}),
        ...(shadowEnabled
          ? {
              shadowColor: component.shadowColor ?? "#000000",
              shadowOpacity: component.shadowOpacity ?? 0.15,
              shadowRadius: component.shadowRadius ?? 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }
          : {}),
      }}
    >
      {gradientEnabled && gradientColors && gradientColors.length >= 2 && (
        <GradientOverlay
          colors={gradientColors}
          direction={component.gradientDirection}
          borderRadius={borderRadius}
        />
      )}
      {content}
    </View>
  );
});
