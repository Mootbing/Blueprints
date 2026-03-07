import React from "react";
import { View, Text, Image } from "react-native";
import type { CardComponent } from "../../types";

export interface CardRendererProps {
  component: CardComponent;
}

export const CardRenderer = React.memo(function CardRenderer({ component }: CardRendererProps) {
  const backgroundColor = component.backgroundColor ?? "#1a1a1a";
  const borderRadius = component.borderRadius ?? 12;
  const borderColor = component.borderColor ?? "transparent";
  const borderWidth = component.borderWidth ?? 0;
  const opacity = component.opacity ?? 1;

  const titleColor = component.titleColor ?? "#ffffff";
  const subtitleColor = component.subtitleColor ?? "#aaaaaa";
  const bodyColor = component.bodyColor ?? "#cccccc";
  const footerColor = component.footerColor ?? "#666666";

  const titleFontSize = component.titleFontSize ?? 18;
  const subtitleFontSize = component.subtitleFontSize ?? 14;
  const bodyFontSize = component.bodyFontSize ?? 14;

  const imagePosition = component.imageUrl
    ? (component.imagePosition ?? "top")
    : undefined;
  const imageHeight = component.imageHeight ?? 0.4;

  const shadowEnabled = component.shadowEnabled ?? false;
  const shadowStyles = shadowEnabled
    ? {
        shadowColor: component.shadowColor ?? "#000000",
        shadowOpacity: component.shadowOpacity ?? 0.15,
        shadowRadius: component.shadowRadius ?? 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }
    : {};

  const contentBlock = (
    <View style={{ flex: 1, padding: 12, justifyContent: "center" }}>
      {component.title ? (
        <Text
          style={{
            color: titleColor,
            fontSize: titleFontSize,
            fontWeight: "bold",
          }}
          numberOfLines={2}
        >
          {component.title}
        </Text>
      ) : null}
      {component.subtitle ? (
        <Text
          style={{
            color: subtitleColor,
            fontSize: subtitleFontSize,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          {component.subtitle}
        </Text>
      ) : null}
      {component.body ? (
        <Text
          style={{
            color: bodyColor,
            fontSize: bodyFontSize,
            marginTop: 8,
          }}
        >
          {component.body}
        </Text>
      ) : null}
    </View>
  );

  const footerBlock = component.footerLabel ? (
    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
      <Text style={{ color: footerColor, fontSize: 12 }}>
        {component.footerLabel}
      </Text>
    </View>
  ) : null;

  // Background image layout
  if (imagePosition === "background") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor,
          borderRadius,
          borderColor,
          borderWidth,
          opacity,
          overflow: "hidden",
          ...shadowStyles,
        }}
      >
        <Image
          source={{ uri: component.imageUrl }}
          resizeMode="cover"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius,
          }}
        />
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {contentBlock}
          {footerBlock}
        </View>
      </View>
    );
  }

  // Left image layout (row)
  if (imagePosition === "left") {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          backgroundColor,
          borderRadius,
          borderColor,
          borderWidth,
          opacity,
          overflow: "hidden",
          ...shadowStyles,
        }}
      >
        <Image
          source={{ uri: component.imageUrl }}
          resizeMode="cover"
          style={{ width: "40%", height: "100%" }}
        />
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          {contentBlock}
          {footerBlock}
        </View>
      </View>
    );
  }

  // Default: top image (or no image) layout
  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        borderColor,
        borderWidth,
        opacity,
        overflow: "hidden",
        ...shadowStyles,
      }}
    >
      {imagePosition === "top" && component.imageUrl ? (
        <Image
          source={{ uri: component.imageUrl }}
          resizeMode="cover"
          style={{
            width: "100%",
            flex: imageHeight,
          }}
        />
      ) : null}
      <View style={{ flex: imagePosition === "top" && component.imageUrl ? 1 - imageHeight : 1, justifyContent: "space-between" }}>
        {contentBlock}
        {footerBlock}
      </View>
    </View>
  );
});
