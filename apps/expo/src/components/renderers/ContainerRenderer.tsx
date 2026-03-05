import React, { useState } from "react";
import { View } from "react-native";
import type { ContainerComponent, Layout } from "../../types";
import type { TextEditingState } from "../TextEditorModal";
import { rendererRegistry } from "./index";
import { GroupChildComponent } from "../GroupChildComponent";

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

export function ContainerRenderer({
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
  const backgroundColor = component.backgroundColor ?? "#ffffff";
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth ?? 0;
  const borderRadius = component.borderRadius ?? 12;
  const padding = (component.padding ?? 0) * 100;
  const shadowEnabled = component.shadowEnabled ?? false;
  const isFlexLayout = component.layoutMode === "flex";

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
        overflow: "hidden",
        ...(isFlexLayout
          ? {
              flexDirection: component.flexDirection ?? "column",
              gap: component.gap ?? 0,
              justifyContent: component.justifyContent ?? "flex-start",
              alignItems: component.alignItems ?? "stretch",
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
      {component.children?.map((child) => {
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
            // Flex layout: children sized by width/height ratios but positioned by flexbox
            const width = child.layout.width * containerSize.width;
            const height = child.layout.height * containerSize.height;
            return (
              <View
                key={child.id}
                style={{
                  width,
                  height,
                }}
              >
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
              style={{
                position: "absolute",
                left,
                top,
                width,
                height,
              }}
            >
              <ChildRenderer component={child} isEditMode={false} />
            </View>
          );
        }

        return null;
      })}
    </View>
  );
}
