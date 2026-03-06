import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";

function hsvToHex(h: number, s: number, v: number): string {
  const s1 = s / 100;
  const v1 = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(
      255 * (v1 - v1 * s1 * Math.max(Math.min(k, 4 - k, 1), 0))
    );
  };
  return `#${f(5).toString(16).padStart(2, "0")}${f(3).toString(16).padStart(2, "0")}${f(1).toString(16).padStart(2, "0")}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = hex.replace("#", "");
  if (c.length !== 6) return { h: 0, s: 0, v: 100 };
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d + 6) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(max * 100) };
}

const HUE_STEPS = 36;
const SV_STEPS = 20;

const WHEEL_SIZE = 220;
const WHEEL_CELLS = 22;
const CELL_SIZE = WHEEL_SIZE / WHEEL_CELLS;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

interface ColorPickerModalProps {
  visible: boolean;
  initialColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

function ColorWheel({
  hue,
  sat,
  val,
  onHueSatChange,
}: {
  hue: number;
  sat: number;
  val: number;
  onHueSatChange: (h: number, s: number) => void;
}) {
  const wheelCells = useMemo(() => {
    const cells: { x: number; y: number; color: string }[] = [];
    for (let row = 0; row < WHEEL_CELLS; row++) {
      for (let col = 0; col < WHEEL_CELLS; col++) {
        const cx = (col + 0.5) * CELL_SIZE - WHEEL_RADIUS;
        const cy = (row + 0.5) * CELL_SIZE - WHEEL_RADIUS;
        const dist = Math.sqrt(cx * cx + cy * cy);
        if (dist > WHEEL_RADIUS - 1) continue;
        const angle = (Math.atan2(-cy, cx) * 180 / Math.PI + 360) % 360;
        const saturation = (dist / WHEEL_RADIUS) * 100;
        cells.push({
          x: col * CELL_SIZE,
          y: row * CELL_SIZE,
          color: hsvToHex(angle, saturation, val),
        });
      }
    }
    return cells;
  }, [val]);

  const indicatorPos = useMemo(() => {
    const angleRad = (hue * Math.PI) / 180;
    const dist = (sat / 100) * WHEEL_RADIUS;
    return {
      x: WHEEL_RADIUS + dist * Math.cos(angleRad) - 10,
      y: WHEEL_RADIUS - dist * Math.sin(angleRad) - 10,
    };
  }, [hue, sat]);

  const handleTouch = useCallback(
    (e: any) => {
      const { locationX, locationY } = e.nativeEvent;
      const cx = locationX - WHEEL_RADIUS;
      const cy = locationY - WHEEL_RADIUS;
      const dist = Math.min(Math.sqrt(cx * cx + cy * cy), WHEEL_RADIUS);
      const angle = (Math.atan2(-cy, cx) * 180 / Math.PI + 360) % 360;
      const saturation = (dist / WHEEL_RADIUS) * 100;
      onHueSatChange(Math.round(angle), Math.round(saturation));
    },
    [onHueSatChange]
  );

  return (
    <View
      style={wheelStyles.container}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      {wheelCells.map((cell, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: cell.x,
            top: cell.y,
            width: CELL_SIZE + 1,
            height: CELL_SIZE + 1,
            backgroundColor: cell.color,
          }}
        />
      ))}
      <View
        style={[
          wheelStyles.indicator,
          { left: indicatorPos.x, top: indicatorPos.y },
        ]}
      />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    overflow: "hidden",
    alignSelf: "center",
    marginBottom: 20,
  },
  indicator: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
});

export function ColorPickerModal({
  visible,
  initialColor,
  onSelect,
  onClose,
}: ColorPickerModalProps) {
  const { width: sw } = useWindowDimensions();
  const sliderWidth = sw - 80;

  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(100);
  const [val, setVal] = useState(100);
  const [hexText, setHexText] = useState("");
  const [showWheel, setShowWheel] = useState(true);

  useEffect(() => {
    if (visible) {
      const safe =
        !initialColor || initialColor === "transparent"
          ? "#FF0000"
          : initialColor;
      const hsv = hexToHsv(safe);
      setHue(hsv.h);
      setSat(hsv.s);
      setVal(hsv.v);
      setHexText(safe.replace("#", "").toUpperCase());
    }
  }, [visible, initialColor]);

  const currentHex = useMemo(() => hsvToHex(hue, sat, val), [hue, sat, val]);

  useEffect(() => {
    setHexText(currentHex.replace("#", "").toUpperCase());
  }, [currentHex]);

  const applyHex = useCallback(() => {
    const clean = hexText.length === 6 ? `#${hexText}` : null;
    if (clean && /^#[0-9A-Fa-f]{6}$/.test(clean)) {
      const hsv = hexToHsv(clean);
      setHue(hsv.h);
      setSat(hsv.s);
      setVal(hsv.v);
    }
  }, [hexText]);

  const hueColors = useMemo(
    () =>
      Array.from({ length: HUE_STEPS }, (_, i) =>
        hsvToHex((i / HUE_STEPS) * 360, 100, 100)
      ),
    []
  );

  const satColors = useMemo(
    () =>
      Array.from({ length: SV_STEPS + 1 }, (_, i) =>
        hsvToHex(hue, (i / SV_STEPS) * 100, val)
      ),
    [hue, val]
  );

  const valColors = useMemo(
    () =>
      Array.from({ length: SV_STEPS + 1 }, (_, i) =>
        hsvToHex(hue, sat, (i / SV_STEPS) * 100)
      ),
    [hue, sat]
  );

  const makeHandler = (setter: (v: number) => void, max: number) => ({
    onStartShouldSetResponder: () => true as const,
    onMoveShouldSetResponder: () => true as const,
    onResponderGrant: (e: any) => {
      setter(
        Math.round(
          Math.max(0, Math.min(max, (e.nativeEvent.locationX / sliderWidth) * max))
        )
      );
    },
    onResponderMove: (e: any) => {
      setter(
        Math.round(
          Math.max(0, Math.min(max, (e.nativeEvent.locationX / sliderWidth) * max))
        )
      );
    },
  });

  const handleWheelHueSat = useCallback((h: number, s: number) => {
    setHue(h);
    setSat(s);
  }, []);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={s.title}>Color Picker</Text>
            <Pressable
              onPress={() => {
                onSelect(currentHex);
                onClose();
              }}
              hitSlop={12}
            >
              <Text style={s.doneText}>Done</Text>
            </Pressable>
          </View>

          <View style={s.previewRow}>
            <View style={[s.previewCircle, { backgroundColor: currentHex }]} />
            <View style={s.hexContainer}>
              <Text style={s.hashText}>#</Text>
              <TextInput
                style={s.hexInput}
                value={hexText}
                onChangeText={(t) =>
                  setHexText(t.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))
                }
                onSubmitEditing={applyHex}
                onBlur={applyHex}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <Pressable
              style={[s.dropperBtn, showWheel && s.dropperBtnActive]}
              hitSlop={8}
              onPress={() => setShowWheel((v) => !v)}
            >
              <Feather name="target" size={20} color={showWheel ? "#6366f1" : "#FFF"} />
            </Pressable>
          </View>

          {showWheel && (
            <ColorWheel
              hue={hue}
              sat={sat}
              val={val}
              onHueSatChange={handleWheelHueSat}
            />
          )}

          {!showWheel && (
            <>
              <Text style={s.label}>Hue</Text>
              <View
                style={[s.sliderWrap, { width: sliderWidth }]}
                {...makeHandler(setHue, 360)}
              >
                <View style={s.sliderTrack}>
                  {hueColors.map((c, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        backgroundColor: c,
                        borderTopLeftRadius: i === 0 ? 8 : 0,
                        borderBottomLeftRadius: i === 0 ? 8 : 0,
                        borderTopRightRadius: i === hueColors.length - 1 ? 8 : 0,
                        borderBottomRightRadius:
                          i === hueColors.length - 1 ? 8 : 0,
                      }}
                    />
                  ))}
                </View>
                <View
                  style={[
                    s.thumb,
                    {
                      left: Math.max(
                        0,
                        Math.min(
                          sliderWidth - 20,
                          (hue / 360) * sliderWidth - 10
                        )
                      ),
                    },
                  ]}
                />
              </View>

              <Text style={s.label}>Saturation</Text>
              <View
                style={[s.sliderWrap, { width: sliderWidth }]}
                {...makeHandler(setSat, 100)}
              >
                <View style={s.sliderTrack}>
                  {satColors.map((c, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        backgroundColor: c,
                        borderTopLeftRadius: i === 0 ? 8 : 0,
                        borderBottomLeftRadius: i === 0 ? 8 : 0,
                        borderTopRightRadius: i === satColors.length - 1 ? 8 : 0,
                        borderBottomRightRadius:
                          i === satColors.length - 1 ? 8 : 0,
                      }}
                    />
                  ))}
                </View>
                <View
                  style={[
                    s.thumb,
                    {
                      left: Math.max(
                        0,
                        Math.min(
                          sliderWidth - 20,
                          (sat / 100) * sliderWidth - 10
                        )
                      ),
                    },
                  ]}
                />
              </View>
            </>
          )}

          <Text style={s.label}>Brightness</Text>
          <View
            style={[s.sliderWrap, { width: sliderWidth }]}
            {...makeHandler(setVal, 100)}
          >
            <View style={s.sliderTrack}>
              {valColors.map((c, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: c,
                    borderTopLeftRadius: i === 0 ? 8 : 0,
                    borderBottomLeftRadius: i === 0 ? 8 : 0,
                    borderTopRightRadius: i === valColors.length - 1 ? 8 : 0,
                    borderBottomRightRadius:
                      i === valColors.length - 1 ? 8 : 0,
                  }}
                />
              ))}
            </View>
            <View
              style={[
                s.thumb,
                {
                  left: Math.max(
                    0,
                    Math.min(
                      sliderWidth - 20,
                      (val / 100) * sliderWidth - 10
                    )
                  ),
                },
              ]}
            />
          </View>
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
    backgroundColor: "#1a1a2e",
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
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
  title: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
  doneText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "600",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  previewCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#FFF",
  },
  hexContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  hashText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontWeight: "600",
  },
  hexInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
    paddingLeft: 4,
  },
  dropperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropperBtnActive: {
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sliderWrap: {
    height: 36,
    marginBottom: 20,
    position: "relative",
  },
  sliderTrack: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
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
});
