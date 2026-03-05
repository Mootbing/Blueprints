import React, { useState, useEffect } from "react";
import { Text, Pressable } from "react-native";
import type { TextComponent } from "../../types";
import { TextEditorModal } from "../TextEditorModal";

interface TextRendererProps {
  component: TextComponent;
  isEditMode?: boolean;
  onContentChange?: (id: string, content: string) => void;
  onStyleChange?: (
    id: string,
    updates: {
      fontSize?: number;
      color?: string;
      backgroundColor?: string;
      fontFamily?: string;
      textAlign?: "left" | "center" | "right";
    }
  ) => void;
}

export function TextRenderer({
  component,
  isEditMode,
  onContentChange,
  onStyleChange,
}: TextRendererProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSave = (config: {
    text: string;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    fontFamily: string;
    textAlign: "left" | "center" | "right";
  }) => {
    if (onContentChange && config.text !== component.content) {
      onContentChange(component.id, config.text);
    }
    if (onStyleChange) {
      onStyleChange(component.id, {
        fontSize: config.fontSize,
        color: config.color,
        backgroundColor: config.backgroundColor,
        fontFamily: config.fontFamily,
        textAlign: config.textAlign,
      });
    }
  };

  if (isEditMode) {
    return (
      <>
        <Pressable style={{ flex: 1 }} onPress={() => setShowModal(true)}>
          <Text
            style={{
              fontSize: component.fontSize,
              color: component.color,
              fontWeight: component.fontWeight as any,
              backgroundColor: (component as any).backgroundColor || "transparent",
              fontFamily: (component as any).fontFamily || "System",
              textAlign: (component as any).textAlign || "left",
              flex: 1,
              paddingHorizontal: (component as any).backgroundColor ? 8 : 0,
              paddingVertical: (component as any).backgroundColor ? 4 : 0,
            }}
          >
            {component.content}
          </Text>
        </Pressable>
        <TextEditorModal
          visible={showModal}
          initialText={component.content}
          initialFontSize={component.fontSize}
          initialColor={component.color}
          initialBackgroundColor={(component as any).backgroundColor}
          initialFontFamily={(component as any).fontFamily || "System"}
          initialTextAlign={(component as any).textAlign || "left"}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <Text
      style={{
        fontSize: component.fontSize,
        color: component.color,
        fontWeight: component.fontWeight as any,
        backgroundColor: (component as any).backgroundColor || "transparent",
        fontFamily: (component as any).fontFamily || "System",
        textAlign: (component as any).textAlign || "left",
        flex: 1,
        paddingHorizontal: (component as any).backgroundColor ? 8 : 0,
        paddingVertical: (component as any).backgroundColor ? 4 : 0,
      }}
    >
      {component.content}
    </Text>
  );
}
