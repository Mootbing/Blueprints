import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import type { ListComponent } from "../../types";

export interface ListRendererProps {
  component: ListComponent;
  isEditMode?: boolean;
}

export const ListRenderer = React.memo(function ListRenderer({ component }: ListRendererProps) {
  const itemHeight = component.itemHeight ?? 56;
  const showDividers = component.showDividers ?? true;
  const dividerColor = component.dividerColor ?? "#1a1a1a";
  const backgroundColor = component.backgroundColor ?? "#0a0a0a";
  const titleColor = component.titleColor ?? "#ccc";
  const subtitleColor = component.subtitleColor ?? "#888888";
  const titleFontSize = component.titleFontSize ?? 16;
  const subtitleFontSize = component.subtitleFontSize ?? 13;
  const showImages = component.showImages ?? true;
  const imageShape = component.imageShape ?? "circle";
  const borderRadius = component.borderRadius ?? 12;

  const imageSize = itemHeight - 16;
  const imageBorderRadius =
    imageShape === "circle" ? imageSize / 2 : imageShape === "rounded" ? 6 : 0;

  return (
    <View style={{ flex: 1, backgroundColor, borderRadius, overflow: "hidden" }}>
      <ScrollView nestedScrollEnabled>
        {component.items.map((item, index) => (
          <View
            key={item.id}
            style={{
              height: itemHeight,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              gap: 12,
              borderBottomWidth:
                showDividers && index < component.items.length - 1 ? 1 : 0,
              borderBottomColor: dividerColor,
            }}
          >
            {showImages && item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageBorderRadius,
                }}
              />
            )}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text
                style={{ fontSize: titleFontSize, color: titleColor, fontWeight: "500" }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text
                  style={{ fontSize: subtitleFontSize, color: subtitleColor, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});
