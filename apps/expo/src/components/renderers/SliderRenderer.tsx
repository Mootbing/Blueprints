import React, { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import type { GestureResponderEvent } from "react-native";
import type { SliderComponent } from "../../types";

export interface SliderRendererProps {
  component: SliderComponent;
  isEditMode?: boolean;
}

export const SliderRenderer = React.memo(function SliderRenderer({ component, isEditMode }: SliderRendererProps) {
  const min = component.min ?? 0;
  const max = component.max ?? 100;
  const step = component.step ?? 1;
  const trackColor = component.trackColor ?? "#333333";
  const activeTrackColor = component.activeTrackColor ?? "#ffffff";
  const thumbColor = component.thumbColor ?? "#ffffff";
  const showValue = component.showValue ?? false;
  const valueColor = component.valueColor ?? "#ffffff";

  const [value, setValue] = useState(component.value ?? min);

  const range = max - min || 1;
  const fraction = Math.max(0, Math.min(1, (value - min) / range));

  const snapToStep = useCallback(
    (raw: number) => {
      const clamped = Math.max(min, Math.min(max, raw));
      const stepped = Math.round((clamped - min) / step) * step + min;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step],
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (isEditMode) return;
      const { locationX } = e.nativeEvent;
      // @ts-ignore – currentTarget may not have measure in all RN versions
      const target = e.currentTarget as unknown as View;
      if (target && typeof (target as any).measure === "function") {
        (target as any).measure((_x: number, _y: number, width: number) => {
          if (width > 0) {
            const newFraction = locationX / width;
            const rawValue = min + newFraction * range;
            setValue(snapToStep(rawValue));
          }
        });
      } else {
        // Fallback: estimate from locationX assuming the track fills its container
        // We can't know width without measure, so use fraction heuristic
        const newFraction = Math.max(0, Math.min(1, locationX / 300));
        const rawValue = min + newFraction * range;
        setValue(snapToStep(rawValue));
      }
    },
    [isEditMode, min, range, snapToStep],
  );

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 12,
      }}
    >
      {showValue && (
        <Text style={{ color: valueColor, marginBottom: 4, textAlign: "center" }}>
          {value}
        </Text>
      )}
      <Pressable
        onPress={handlePress}
        disabled={isEditMode}
        style={{ justifyContent: "center", height: 20 }}
      >
        {/* Track */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: trackColor,
            width: "100%",
          }}
        >
          {/* Active track */}
          <View
            style={{
              position: "absolute",
              left: 0,
              height: 4,
              borderRadius: 2,
              backgroundColor: activeTrackColor,
              width: `${fraction * 100}%`,
            }}
          />
        </View>
        {/* Thumb */}
        <View
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: thumbColor,
            left: `${fraction * 100}%`,
            marginLeft: -10,
            top: 0,
          }}
        />
      </Pressable>
    </View>
  );
});
