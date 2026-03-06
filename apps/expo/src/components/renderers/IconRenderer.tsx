import React, { useEffect, useRef } from "react";
import { View, Pressable } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { IconComponent } from "../../types";
import type { TextEditingState } from "../EditorToolbar";

export interface IconRendererProps {
  component: IconComponent;
  isEditMode?: boolean;
  editTapFired?: boolean;
  consumeEditTap?: () => void;
  editState?: TextEditingState | null;
  onEditStart?: (state: TextEditingState) => void;
  onEditStateChange?: (updates: Partial<TextEditingState>) => void;
}

export const IconRenderer = React.memo(function IconRenderer({
  component,
  isEditMode,
  editTapFired,
  consumeEditTap,
  editState,
  onEditStart,
}: IconRendererProps) {
  const library = component.library ?? "material";
  const size = editState?.fontSize ?? component.size ?? 24;
  const color = editState?.color ?? component.color ?? "#1a1a1a";
  const iconName = editState?.text ?? component.name;

  const didFireRef = useRef(false);

  useEffect(() => {
    if (editTapFired && !didFireRef.current && isEditMode && onEditStart) {
      didFireRef.current = true;
      consumeEditTap?.();
      onEditStart({
        text: component.name ?? "star",
        fontSize: component.size ?? 24,
        color: component.color ?? "#ccc",
        backgroundColor: "transparent",
        fontFamily: "System",
        fontWeight: "normal",
        textAlign: "left",
        wrapMode: "wrap-word",
        fontStyle: "normal",
        textDecorationLine: "none",
      });
    }
    if (!editTapFired) didFireRef.current = false;
  }, [editTapFired, isEditMode, onEditStart, consumeEditTap, component.name, component.size, component.color]);

  let IconComp: React.ElementType;
  switch (library) {
    case "feather":
      IconComp = Feather;
      break;
    case "ionicons":
      IconComp = Ionicons;
      break;
    default:
      IconComp = MaterialIcons;
      break;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Icon libraries have incompatible name type unions; `as any` is unavoidable here */}
      <IconComp name={iconName as any} size={size} color={color} />
    </View>
  );
});
