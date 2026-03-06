import React, { useCallback } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import type { ListComponent } from "../../types";
import { useRuntimeStore } from "../../runtime/useRuntimeStore";
import { executeActions } from "../../runtime/executeActions";

export interface ListRendererProps {
  component: ListComponent;
  isEditMode?: boolean;
  onNavigate?: (screenId: string) => void;
  onResetAndBuild?: () => void;
}

interface ResolvedItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  _raw: unknown;
  _index: number;
}

export const ListRenderer = React.memo(function ListRenderer({
  component,
  isEditMode,
  onNavigate,
  onResetAndBuild,
}: ListRendererProps) {
  const variables = useRuntimeStore((s) => s.variables);
  const store = useRuntimeStore();

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

  const titleKey = component.itemTitleKey ?? "title";
  const subtitleKey = component.itemSubtitleKey ?? "subtitle";
  const imageKey = component.itemImageKey ?? "imageUrl";

  // Resolve items: dynamic source takes priority over static items
  let resolvedItems: ResolvedItem[] = [];

  if (component.itemsSource && !isEditMode) {
    const source = variables[component.itemsSource];
    if (Array.isArray(source)) {
      resolvedItems = source.map((raw, i) => {
        if (typeof raw === "object" && raw !== null) {
          const obj = raw as Record<string, unknown>;
          return {
            id: String(obj.id ?? i),
            title: String(obj[titleKey] ?? ""),
            subtitle: obj[subtitleKey] != null ? String(obj[subtitleKey]) : undefined,
            imageUrl: obj[imageKey] != null ? String(obj[imageKey]) : undefined,
            _raw: raw,
            _index: i,
          };
        }
        return {
          id: String(i),
          title: String(raw),
          _raw: raw,
          _index: i,
        };
      });
    }
  } else {
    resolvedItems = (component.items ?? []).map((item, i) => ({
      ...item,
      _raw: item,
      _index: i,
    }));
  }

  const hasItemTap =
    !isEditMode &&
    component.actions?.onItemTap &&
    component.actions.onItemTap.length > 0;

  const handleItemTap = useCallback(
    async (item: ResolvedItem) => {
      if (!hasItemTap) return;
      // Inject item context as temporary variables
      store.setVariable("_item", item._raw);
      store.setVariable("_itemIndex", item._index);
      store.setVariable("_itemId", item.id);
      store.setVariable("_itemTitle", item.title);
      await executeActions(component.actions!.onItemTap!, store, {
        navigate: (id) => onNavigate?.(id),
        resetAndBuild: onResetAndBuild,
      });
    },
    [hasItemTap, store, component.actions, onNavigate, onResetAndBuild],
  );

  const imageSize = itemHeight - 16;
  const imageBorderRadius =
    imageShape === "circle" ? imageSize / 2 : imageShape === "rounded" ? 6 : 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        overflow: "hidden",
        opacity: component.opacity ?? 1,
      }}
    >
      <ScrollView nestedScrollEnabled>
        {resolvedItems.map((item, index) => {
          const row = (
            <View
              style={{
                height: itemHeight,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                gap: 12,
                borderBottomWidth:
                  showDividers && index < resolvedItems.length - 1 ? 1 : 0,
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
                  style={{
                    fontSize: titleFontSize,
                    color: titleColor,
                    fontWeight: "500",
                  }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text
                    style={{
                      fontSize: subtitleFontSize,
                      color: subtitleColor,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          );

          if (hasItemTap) {
            return (
              <Pressable key={item.id} onPress={() => handleItemTap(item)}>
                {row}
              </Pressable>
            );
          }
          return <View key={item.id}>{row}</View>;
        })}
      </ScrollView>
    </View>
  );
});
