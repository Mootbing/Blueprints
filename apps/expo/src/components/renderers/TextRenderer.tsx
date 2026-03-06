import React, { useEffect } from "react";
import { Text, TextInput } from "react-native";
import type { TextComponent } from "../../types";
import type { TextEditingState } from "../EditorToolbar";

export interface TextRendererProps {
  component: TextComponent;
  isEditMode?: boolean;
  editTapFired?: boolean;
  consumeEditTap?: () => void;
  editState?: TextEditingState | null;
  onEditStart?: (initialState: TextEditingState) => void;
  onEditStateChange?: (updates: Partial<TextEditingState>) => void;
}

function getWrapStyle(wrapMode?: string) {
  if (wrapMode === "no-wrap") return { numberOfLines: 1, ellipsizeMode: "clip" as const };
  return {};
}

/** Insert zero-width spaces between chars so RN can break at any letter */
function letterWrap(text: string): string {
  return text.split("").join("\u200B");
}

export const TextRenderer = React.memo(function TextRenderer({
  component,
  isEditMode,
  editTapFired,
  consumeEditTap,
  editState,
  onEditStart,
  onEditStateChange,
}: TextRendererProps) {
  const compWrapMode = component.wrapMode || "wrap-word";

  useEffect(() => {
    if (editTapFired && isEditMode && !editState) {
      consumeEditTap?.();
      onEditStart?.({
        text: component.content,
        fontSize: component.fontSize,
        color: component.color,
        backgroundColor: component.backgroundColor || "transparent",
        fontFamily: component.fontFamily || "System",
        textAlign: component.textAlign || "left",
        wrapMode: compWrapMode,
        fontWeight: component.fontWeight === "bold" ? "bold" : "normal",
        fontStyle: "normal",
        textDecorationLine: "none",
      });
    }
  }, [editTapFired, isEditMode, editState, consumeEditTap, component, compWrapMode, onEditStart]);

  if (editState) {
    return (
      <TextInput
        style={{
          fontSize: editState.fontSize,
          color: editState.color,
          backgroundColor: editState.backgroundColor === "transparent" ? undefined : editState.backgroundColor,
          fontFamily: editState.fontFamily === "System" ? undefined : editState.fontFamily,
          textAlign: editState.textAlign,
          fontWeight: editState.fontWeight,
          fontStyle: editState.fontStyle,
          textDecorationLine: editState.textDecorationLine,
          width: "100%",
          minHeight: editState.fontSize * 1.4,
          padding: 0,
          paddingHorizontal: editState.backgroundColor !== "transparent" ? 8 : 0,
          paddingVertical: editState.backgroundColor !== "transparent" ? 4 : 0,
        }}
        value={editState.text}
        onChangeText={(t) => onEditStateChange?.({ text: t })}
        multiline={editState.wrapMode !== "no-wrap"}
        autoFocus
        selectTextOnFocus
      />
    );
  }

  const textStyle = {
    fontSize: component.fontSize,
    color: component.color,
    fontWeight: component.fontWeight || ("normal" as const),
    backgroundColor: component.backgroundColor || "transparent",
    fontFamily: component.fontFamily || undefined,
    textAlign: (component.textAlign || "left") as "left" | "center" | "right",
    letterSpacing: component.letterSpacing,
    lineHeight: component.lineHeight,
    textTransform: component.textTransform,
    opacity: component.opacity ?? 1,
    flex: 1,
    paddingHorizontal: component.backgroundColor ? 8 : 0,
    paddingVertical: component.backgroundColor ? 4 : 0,
  } as const;

  return (
    <Text style={textStyle} {...getWrapStyle(compWrapMode)}>
      {compWrapMode === "wrap-text" ? letterWrap(component.content) : component.content}
    </Text>
  );
});
