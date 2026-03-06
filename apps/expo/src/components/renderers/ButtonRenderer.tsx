import React, { useEffect } from "react";
import { Text, TextInput, View } from "react-native";
import type { ButtonComponent } from "../../types";
import type { TextEditingState } from "../EditorToolbar";
import { GradientOverlay } from "../GradientOverlay";

export interface ButtonRendererProps {
  component: ButtonComponent;
  isEditMode?: boolean;
  editTapFired?: boolean;
  consumeEditTap?: () => void;
  editState?: TextEditingState | null;
  onEditStart?: (initialState: TextEditingState) => void;
  onEditStateChange?: (updates: Partial<TextEditingState>) => void;
}

export const ButtonRenderer = React.memo(function ButtonRenderer({
  component,
  isEditMode,
  editTapFired,
  consumeEditTap,
  editState,
  onEditStart,
  onEditStateChange,
}: ButtonRendererProps) {
  useEffect(() => {
    if (editTapFired && isEditMode && !editState) {
      consumeEditTap?.();
      onEditStart?.({
        text: component.label,
        fontSize: component.fontSize || 16,
        color: component.textColor,
        backgroundColor: component.backgroundColor,
        fontFamily: component.fontFamily || "System",
        textAlign: component.textAlign || "center",
        wrapMode: "wrap-word",
        fontWeight: component.fontWeight === "bold" ? "bold" : "normal",
        fontStyle: "normal",
        textDecorationLine: "none",
      });
    }
  }, [editTapFired, isEditMode, editState, consumeEditTap, component, onEditStart]);

  if (editState) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: editState.backgroundColor,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: component.borderRadius ?? 8,
      }}>
        <TextInput
          style={{
            color: editState.color,
            fontSize: editState.fontSize,
            fontFamily: editState.fontFamily === "System" ? undefined : editState.fontFamily,
            fontWeight: editState.fontWeight,
            textAlign: editState.textAlign,
            padding: 0,
            width: "100%",
            textAlignVertical: "center",
          }}
          value={editState.text}
          onChangeText={(t) => onEditStateChange?.({ text: t })}
          autoFocus
        />
      </View>
    );
  }

  const shadowEnabled = component.shadowEnabled ?? false;
  const gradientEnabled = component.gradientEnabled ?? false;
  const gradientColors = component.gradientColors;
  const btnBorderRadius = component.borderRadius ?? 8;

  const buttonStyle = {
    flex: 1,
    backgroundColor: component.backgroundColor,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: btnBorderRadius,
    ...(shadowEnabled
      ? {
          shadowColor: component.shadowColor ?? "#000000",
          shadowOpacity: component.shadowOpacity ?? 0.15,
          shadowRadius: component.shadowRadius ?? 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }
      : {}),
  };

  const textStyle = {
    color: component.textColor,
    fontSize: component.fontSize || 16,
    fontFamily: component.fontFamily || undefined,
    fontWeight: component.fontWeight || ("normal" as const),
    textAlign: component.textAlign || ("center" as const),
  };

  return (
    <View style={buttonStyle}>
      {gradientEnabled && gradientColors && gradientColors.length >= 2 && (
        <GradientOverlay
          colors={gradientColors}
          direction={component.gradientDirection}
          borderRadius={btnBorderRadius}
        />
      )}
      <Text style={textStyle}>{component.label}</Text>
    </View>
  );
});
