import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Image, Dimensions } from "react-native";
import type { NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from "react-native";
import type { CarouselComponent } from "../../types";
import { useRuntimeStore } from "../../runtime/useRuntimeStore";

export interface CarouselRendererProps {
  component: CarouselComponent;
  isEditMode?: boolean;
}

interface ResolvedCarouselItem {
  id: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
}

export const CarouselRenderer = React.memo(function CarouselRenderer({
  component,
  isEditMode,
}: CarouselRendererProps) {
  const variables = useRuntimeStore((s) => s.variables);

  const imageKey = component.itemImageKey ?? "imageUrl";
  const titleKey = component.itemTitleKey ?? "title";
  const subtitleKey = component.itemSubtitleKey ?? "subtitle";
  const borderRadius = component.borderRadius ?? 12;
  const titleColor = component.titleColor ?? "#ffffff";
  const subtitleColor = component.subtitleColor ?? "#aaaaaa";
  const activeDotColor = component.activeDotColor ?? "#ffffff";
  const dotColor = component.dotColor ?? "#555555";
  const showDots = component.showDots !== false;
  const autoPlay = component.autoPlay ?? false;
  const interval = component.interval ?? 3000;

  // Resolve items
  let resolvedItems: ResolvedCarouselItem[] = [];

  if (component.itemsSource && !isEditMode) {
    const source = variables[component.itemsSource];
    if (Array.isArray(source)) {
      resolvedItems = source.map((raw, i) => {
        if (typeof raw === "object" && raw !== null) {
          const obj = raw as Record<string, unknown>;
          return {
            id: String(obj.id ?? i),
            imageUrl: obj[imageKey] != null ? String(obj[imageKey]) : undefined,
            title: obj[titleKey] != null ? String(obj[titleKey]) : undefined,
            subtitle: obj[subtitleKey] != null ? String(obj[subtitleKey]) : undefined,
          };
        }
        return { id: String(i) };
      });
    }
  } else {
    resolvedItems = (component.items ?? []).map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      title: item.title,
      subtitle: item.subtitle,
    }));
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width
  );
  const scrollViewRef = useRef<ScrollView>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setContainerWidth(width);
    }
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (containerWidth <= 0) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / containerWidth);
      setActiveIndex(index);
    },
    [containerWidth]
  );

  // Auto-play
  useEffect(() => {
    if (!autoPlay || isEditMode || resolvedItems.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % resolvedItems.length;
        scrollViewRef.current?.scrollTo({
          x: next * containerWidth,
          animated: true,
        });
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, isEditMode, resolvedItems.length, interval, containerWidth]);

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius,
      }}
      onLayout={onLayout}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {resolvedItems.map((item) => (
          <View
            key={item.id}
            style={{
              width: containerWidth,
              flex: 1,
            }}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: "100%",
                  flex: 1,
                  borderRadius,
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {(item.title || item.subtitle) && (
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  right: 12,
                }}
              >
                {item.title ? (
                  <Text
                    style={{
                      color: titleColor,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                ) : null}
                {item.subtitle ? (
                  <Text
                    style={{
                      color: subtitleColor,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {showDots && resolvedItems.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 8,
            gap: 6,
          }}
        >
          {resolvedItems.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={item.id}
                style={{
                  width: isActive ? 8 : 6,
                  height: isActive ? 8 : 6,
                  borderRadius: isActive ? 4 : 3,
                  backgroundColor: isActive ? activeDotColor : dotColor,
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
});
