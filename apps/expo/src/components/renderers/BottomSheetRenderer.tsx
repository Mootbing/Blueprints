import React, { useState } from "react";
import { View, Text } from "react-native";
import type { BottomSheetComponent, Layout } from "../../types";
import type { TextEditingState } from "../EditorToolbar";
import { GroupChildComponent } from "../GroupChildComponent";
import { rendererRegistry } from "./index";

export interface BottomSheetRendererProps {
  component: BottomSheetComponent;
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

export const BottomSheetRenderer = React.memo(function BottomSheetRenderer({
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
}: BottomSheetRendererProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const backgroundColor = component.backgroundColor ?? "#1a1a1a";
  const handleColor = component.handleColor ?? "#666666";
  const borderRadius = component.borderRadius ?? 16;

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

  // Handle bar element (shared between both modes)
  const handleBar = (
    <View
      style={{
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: handleColor,
        alignSelf: "center",
        marginTop: 8,
      }}
    />
  );

  if (isEditMode) {
    // Edit mode: render inline like a container with a "Sheet" badge
    return (
      <View
        style={{
          flex: 1,
          backgroundColor,
          borderRadius,
          overflow: "hidden",
        }}
      >
        {handleBar}

        {/* Sheet badge */}
        <View
          style={{
            position: "absolute",
            top: 4,
            right: 8,
          }}
        >
          <Text
            style={{
              color: "#888888",
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.5,
            }}
          >
            Sheet
          </Text>
        </View>

        {/* Children area */}
        <View
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerSize({ width, height });
          }}
          style={{ flex: 1, marginTop: 8 }}
        >
          {renderChildren()}
        </View>
      </View>
    );
  }

  // Runtime mode: render sheet content
  // (visibility is controlled by parent SmartComponentWrapper via visibleWhen)
  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        overflow: "hidden",
      }}
    >
      {handleBar}

      {/* Children area */}
      <View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setContainerSize({ width, height });
        }}
        style={{ flex: 1, marginTop: 8 }}
      >
        {renderChildren()}
      </View>
    </View>
  );
});
