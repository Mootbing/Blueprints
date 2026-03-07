import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { AppBarComponent } from "../../types";
import { useRuntimeStore } from "../../runtime/useRuntimeStore";
import { executeActions } from "../../runtime/executeActions";

export interface AppBarRendererProps {
  component: AppBarComponent;
  isEditMode?: boolean;
  onNavigate?: (screenId: string) => void;
  onResetAndBuild?: () => void;
}

export const AppBarRenderer = React.memo(function AppBarRenderer({
  component,
  isEditMode,
  onNavigate,
  onResetAndBuild,
}: AppBarRendererProps) {
  const store = useRuntimeStore();

  const title = component.title;
  const leftIcon = component.leftIcon;
  const rightIcon = component.rightIcon;
  const iconLibrary = component.iconLibrary ?? "feather";
  const backgroundColor = component.backgroundColor ?? "transparent";
  const titleColor = component.titleColor ?? "#ffffff";
  const iconColor = component.iconColor ?? "#ffffff";
  const titleFontSize = component.titleFontSize ?? 18;
  const titleFontWeight = component.titleFontWeight ?? "600";
  const borderBottom = component.borderBottom ?? false;
  const borderColor = component.borderColor ?? "#333333";

  let IconComp: React.ElementType;
  switch (iconLibrary) {
    case "material":
      IconComp = MaterialIcons;
      break;
    case "ionicons":
      IconComp = Ionicons;
      break;
    default:
      IconComp = Feather;
      break;
  }

  const handleLeftTap = useCallback(async () => {
    if (isEditMode) return;
    const actions = component.actions?.onLeftTap;
    if (!actions || actions.length === 0) return;
    await executeActions(actions, store, {
      navigate: (id) => onNavigate?.(id),
      resetAndBuild: onResetAndBuild,
    });
  }, [isEditMode, component.actions, store, onNavigate, onResetAndBuild]);

  const handleRightTap = useCallback(async () => {
    if (isEditMode) return;
    const actions = component.actions?.onRightTap;
    if (!actions || actions.length === 0) return;
    await executeActions(actions, store, {
      navigate: (id) => onNavigate?.(id),
      resetAndBuild: onResetAndBuild,
    });
  }, [isEditMode, component.actions, store, onNavigate, onResetAndBuild]);

  const hasLeftTap =
    !isEditMode &&
    component.actions?.onLeftTap &&
    component.actions.onLeftTap.length > 0;

  const hasRightTap =
    !isEditMode &&
    component.actions?.onRightTap &&
    component.actions.onRightTap.length > 0;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor,
        paddingHorizontal: 16,
        borderBottomWidth: borderBottom ? 1 : 0,
        borderBottomColor: borderColor,
      }}
    >
      {/* Left icon area */}
      <View style={{ width: 40, alignItems: "flex-start" }}>
        {leftIcon ? (
          <Pressable
            onPress={handleLeftTap}
            disabled={!hasLeftTap}
            pointerEvents={isEditMode ? "none" : "auto"}
          >
            {/* Icon libraries have incompatible name type unions; `as any` is unavoidable here */}
            <IconComp name={leftIcon as any} size={24} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {/* Title */}
      <Text
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: titleFontSize,
          color: titleColor,
          fontWeight: titleFontWeight,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right icon area */}
      <View style={{ width: 40, alignItems: "flex-end" }}>
        {rightIcon ? (
          <Pressable
            onPress={handleRightTap}
            disabled={!hasRightTap}
            pointerEvents={isEditMode ? "none" : "auto"}
          >
            <IconComp name={rightIcon as any} size={24} color={iconColor} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});
