import React, { useCallback } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import type { ListComponent, ListItem } from "../../types";
import { safeOpenUrl } from "../../utils/safeUrl";

export interface ListRendererProps {
  component: ListComponent;
  isEditMode?: boolean;
  onNavigate?: (screenId: string) => void;
}

export function ListRenderer({ component, isEditMode, onNavigate }: ListRendererProps) {
  const itemHeight = component.itemHeight ?? 56;
  const showDividers = component.showDividers ?? true;
  const dividerColor = component.dividerColor ?? "#e0e0e0";
  const backgroundColor = component.backgroundColor ?? "#ffffff";
  const titleColor = component.titleColor ?? "#1a1a1a";
  const subtitleColor = component.subtitleColor ?? "#888888";
  const titleFontSize = component.titleFontSize ?? 16;
  const subtitleFontSize = component.subtitleFontSize ?? 13;
  const showImages = component.showImages ?? true;
  const imageShape = component.imageShape ?? "circle";
  const borderRadius = component.borderRadius ?? 12;

  const imageSize = itemHeight - 16;
  const imageBorderRadius =
    imageShape === "circle" ? imageSize / 2 : imageShape === "rounded" ? 6 : 0;

  const handleItemPress = useCallback(
    (item: ListItem) => {
      if (isEditMode || !item.interactions) return;
      for (const interaction of item.interactions) {
        if (interaction.trigger === "onTap") {
          if (interaction.action === "navigate" && onNavigate) {
            onNavigate(interaction.target);
          } else if (interaction.action === "openUrl") {
            safeOpenUrl(interaction.target);
          }
        }
      }
    },
    [isEditMode, onNavigate]
  );

  return (
    <View style={{ flex: 1, backgroundColor, borderRadius, overflow: "hidden" }}>
      <ScrollView nestedScrollEnabled>
        {component.items.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => handleItemPress(item)}
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
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
