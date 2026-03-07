import React from "react";
import { View, Text, Image } from "react-native";
import type { AvatarComponent } from "../../types";

export interface AvatarRendererProps {
  component: AvatarComponent;
}

export const AvatarRenderer = React.memo(function AvatarRenderer({ component }: AvatarRendererProps) {
  const size = component.size ?? 40;
  const backgroundColor = component.backgroundColor ?? "#333333";
  const textColor = component.textColor ?? "#ffffff";
  const fontSize = component.fontSize ?? size * 0.4;
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          overflow: "hidden",
          borderColor,
          borderWidth,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {component.src ? (
          <Image
            source={{ uri: component.src }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
            }}
          />
        ) : component.initials ? (
          <Text
            style={{
              color: textColor,
              fontSize,
              fontWeight: "600",
            }}
          >
            {component.initials}
          </Text>
        ) : null}
      </View>
    </View>
  );
});
