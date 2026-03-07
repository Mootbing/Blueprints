import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { AccordionComponent, Layout } from "../../types";
import type { TextEditingState } from "../EditorToolbar";
import { GroupChildComponent } from "../GroupChildComponent";
import { Feather } from "@expo/vector-icons";
import { rendererRegistry } from "./index";

export interface AccordionRendererProps {
  component: AccordionComponent;
  isEditMode?: boolean;
  isDrilledInto?: boolean;
  selectedChildId?: string | null;
  editingComponentId?: string | null;
  editState?: TextEditingState | null;
  onChildSelect?: (id: string) => void;
  onChildUpdate?: (id: string, layout: Layout) => void;
  onChildEditStart?: (
    componentId: string,
    initialState: TextEditingState
  ) => void;
  onChildEditStateChange?: (updates: Partial<TextEditingState>) => void;
  onDrillInto?: (id: string) => void;
  onChildStyleSelect?: (componentId: string) => void;
  onChildPickImage?: (componentId: string) => void;
}

export const AccordionRenderer = React.memo(function AccordionRenderer({
  component,
  isEditMode,
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
}: AccordionRendererProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [expanded, setExpanded] = useState(component.expanded ?? false);

  const backgroundColor = component.backgroundColor ?? "transparent";
  const borderRadius = component.borderRadius ?? 8;
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth ?? 0;
  const titleColor = component.titleColor ?? "#ffffff";
  const titleFontSize = component.titleFontSize ?? 16;
  const iconColor = component.iconColor ?? "#888888";

  // In edit mode, always show content expanded
  const isExpanded = isEditMode ? true : expanded;

  const renderChildren = () => {
    if (
      isDrilledInto &&
      isEditMode &&
      containerSize.width > 0 &&
      onChildSelect &&
      onChildUpdate &&
      onChildEditStart &&
      onDrillInto &&
      onChildStyleSelect
    ) {
      return component.children?.map((child) => (
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
      ));
    }

    if (containerSize.width > 0) {
      return component.children?.map((child) => {
        const Renderer = rendererRegistry[child.type];
        if (!Renderer) return null;

        const left = child.layout.x * containerSize.width;
        const top = child.layout.y * containerSize.height;
        const width = child.layout.width * containerSize.width;
        const height = child.layout.height * containerSize.height;
        return (
          <View
            key={child.id}
            style={{ position: "absolute", left, top, width, height }}
          >
            <Renderer component={child} isEditMode={false} />
          </View>
        );
      });
    }

    return null;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        borderColor: borderColor ?? "transparent",
        borderWidth,
        overflow: "hidden",
      }}
    >
      {/* Title row */}
      <Pressable
        onPress={() => {
          if (!isEditMode) {
            setExpanded((prev) => !prev);
          }
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: titleColor,
            fontSize: titleFontSize,
            fontWeight: "600",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {component.title}
        </Text>
        <Feather
          name={isExpanded ? "chevron-down" : "chevron-right"}
          color={iconColor}
          size={20}
        />
      </Pressable>

      {/* Content area */}
      {isExpanded && (
        <View
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerSize({ width, height });
          }}
          style={{ flex: 1, padding: 12 }}
        >
          {renderChildren()}
        </View>
      )}
    </View>
  );
});
