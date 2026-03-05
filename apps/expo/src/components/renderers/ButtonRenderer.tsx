import React, { useEffect, useCallback } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ButtonComponent } from "../../types";
import type { TextEditingState } from "../TextEditorModal";
import { safeOpenUrl } from "../../utils/safeUrl";

export interface ButtonRendererProps {
  component: ButtonComponent;
  isEditMode?: boolean;
  editTapFired?: boolean;
  consumeEditTap?: () => void;
  editState?: TextEditingState | null;
  onEditStart?: (initialState: TextEditingState) => void;
  onEditStateChange?: (updates: Partial<TextEditingState>) => void;
  onNavigate?: (screenId: string) => void;
  onResetAndBuild?: () => void;
}

export function ButtonRenderer({
  component,
  isEditMode,
  editTapFired,
  consumeEditTap,
  editState,
  onEditStart,
  onEditStateChange,
  onNavigate,
  onResetAndBuild,
}: ButtonRendererProps) {
  const handlePress = useCallback(() => {
    if (!component.interactions) return;
    for (const interaction of component.interactions) {
      if (interaction.trigger === "onTap") {
        if (interaction.action === "navigate" && onNavigate) {
          onNavigate(interaction.target);
        } else if (interaction.action === "resetAndBuild" && onResetAndBuild) {
          onResetAndBuild();
        } else if (interaction.action === "openUrl") {
          safeOpenUrl(interaction.target);
        }
      }
    }
  }, [component.interactions, onNavigate, onResetAndBuild]);

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

  const buttonStyle = {
    flex: 1,
    backgroundColor: component.backgroundColor,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: component.borderRadius ?? 8,
  };

  const textStyle = {
    color: component.textColor,
    fontSize: component.fontSize || 16,
    fontFamily: component.fontFamily || undefined,
    fontWeight: component.fontWeight || ("normal" as const),
    textAlign: component.textAlign || ("center" as const),
  };

  if (isEditMode) {
    return (
      <View style={buttonStyle}>
        <Text style={textStyle}>{component.label}</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress} style={buttonStyle}>
      <Text style={textStyle}>{component.label}</Text>
    </Pressable>
  );
}
