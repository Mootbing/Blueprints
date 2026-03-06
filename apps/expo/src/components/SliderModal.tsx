import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from "react-native";

interface SliderModalProps {
  visible: boolean;
  title: string;
  initialValue: number;
  min: number;
  max: number;
  presets?: { label: string; value: number }[];
  onSelect: (value: number) => void;
  onClose: () => void;
}

export function SliderModal({
  visible,
  title,
  initialValue,
  min,
  max,
  presets,
  onSelect,
  onClose,
}: SliderModalProps) {
  const { width: sw } = useWindowDimensions();
  const sliderWidth = sw - 80;

  const [value, setValue] = useState(initialValue);
  const [textValue, setTextValue] = useState(String(initialValue));

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setTextValue(String(initialValue));
    }
  }, [visible, initialValue]);

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  const handleSliderTouch = useCallback(
    (e: any) => {
      const x = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / sliderWidth));
      setValue(Math.round(min + ratio * (max - min)));
    },
    [sliderWidth, min, max]
  );

  const applyText = useCallback(() => {
    const num = parseInt(textValue, 10);
    if (!isNaN(num) && num >= 0) {
      setValue(num);
    } else {
      setTextValue(String(value));
    }
  }, [textValue, value]);

  if (!visible) return null;

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={s.title}>{title}</Text>
            <Pressable
              onPress={() => {
                onSelect(value);
                onClose();
              }}
              hitSlop={12}
            >
              <Text style={s.doneText}>Done</Text>
            </Pressable>
          </View>

          <View style={s.valueRow}>
            <TextInput
              style={s.valueInput}
              value={textValue}
              onChangeText={(t) =>
                setTextValue(t.replace(/[^0-9]/g, "").slice(0, 4))
              }
              onSubmitEditing={applyText}
              onBlur={applyText}
              keyboardType="number-pad"
              selectTextOnFocus
            />
          </View>

          <View
            style={[s.sliderWrap, { width: sliderWidth }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleSliderTouch}
            onResponderMove={handleSliderTouch}
          >
            <View style={s.sliderTrack}>
              <View
                style={[s.sliderFill, { width: `${ratio * 100}%` }]}
              />
            </View>
            <View
              style={[
                s.thumb,
                {
                  left: Math.max(
                    0,
                    Math.min(sliderWidth - 20, ratio * sliderWidth - 10)
                  ),
                },
              ]}
            />
          </View>

          <View style={s.rangeRow}>
            <Text style={s.rangeText}>{min}</Text>
            <Text style={s.rangeText}>{max}</Text>
          </View>

          {presets && presets.length > 0 && (
            <>
              <Text style={s.label}>Presets</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.presetsRow}
              >
                {presets.map((p) => {
                  const active = value === p.value;
                  return (
                    <Pressable
                      key={p.label}
                      style={[s.presetButton, active && s.presetButtonActive]}
                      onPress={() => setValue(p.value)}
                    >
                      <Text style={[s.presetLabel, active && s.presetLabelActive]}>
                        {p.label}
                      </Text>
                      <Text style={[s.presetValue, active && s.presetLabelActive]}>
                        {p.value}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cancelText: {
    color: "#555",
    fontSize: 16,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  valueRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  valueInput: {
    fontSize: 48,
    fontWeight: "200",
    color: "#fff",
    textAlign: "center",
    minWidth: 80,
    padding: 0,
    fontVariant: ["tabular-nums"],
  },
  label: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 2.5,
  },
  sliderWrap: {
    height: 36,
    marginBottom: 8,
    position: "relative",
    alignSelf: "center",
  },
  sliderTrack: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#333",
    borderRadius: 8,
  },
  thumb: {
    position: "absolute",
    top: -2,
    width: 20,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  rangeText: {
    color: "#333",
    fontSize: 11,
    fontWeight: "600",
  },
  presetsRow: {
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  presetLabel: {
    color: "#555",
    fontSize: 12,
    fontWeight: "700",
  },
  presetValue: {
    color: "#333",
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  presetLabelActive: {
    color: "#000",
  },
});
