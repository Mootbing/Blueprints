import React, { useState } from "react";
import {
  Modal,
  View,
  TextInput,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TextEditorModalProps {
  visible: boolean;
  initialText: string;
  initialFontSize: number;
  initialColor: string;
  initialBackgroundColor?: string;
  initialFontFamily?: string;
  initialTextAlign?: "left" | "center" | "right";
  onClose: () => void;
  onSave: (config: {
    text: string;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    fontFamily: string;
    textAlign: "left" | "center" | "right";
    fontStyle?: "normal" | "italic";
    textDecorationLine?: "none" | "underline";
  }) => void;
}

const FONTS = [
  { name: "Modern", value: "System" },
  { name: "Classic", value: "serif" },
  { name: "Signature", value: "cursive" },
  { name: "Bold", value: "System" },
  { name: "Typewriter", value: "monospace" },
];

const COLORS = [
  "#FFFFFF",
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

export function TextEditorModal({
  visible,
  initialText,
  initialFontSize,
  initialColor,
  initialBackgroundColor,
  initialFontFamily = "System",
  initialTextAlign = "center",
  onClose,
  onSave,
}: TextEditorModalProps) {
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [color, setColor] = useState(initialColor);
  const [backgroundColor, setBackgroundColor] = useState(
    initialBackgroundColor || "transparent"
  );
  const [fontFamily, setFontFamily] = useState(initialFontFamily);
  const [textAlign, setTextAlign] = useState(initialTextAlign);
  const [showFonts, setShowFonts] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [colorIndex, setColorIndex] = useState(() => {
    const idx = COLORS.indexOf(initialColor);
    return idx >= 0 ? idx : 0;
  });
  const [showFormatBubbles, setShowFormatBubbles] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Custom Vertical Slider
  const sliderHeight = SCREEN_HEIGHT * 0.4;
  const minFontSize = 12;
  const maxFontSize = 120;
  const sliderOffset = useSharedValue(
    ((fontSize - minFontSize) / (maxFontSize - minFontSize)) * (sliderHeight - 40)
  );

  const updateFontSize = (offset: number) => {
    const trackRange = sliderHeight - 40; // thumbSize
    const normalized = Math.max(0, Math.min(offset / trackRange, 1));
    const newSize = minFontSize + normalized * (maxFontSize - minFontSize);
    setFontSize(Math.round(newSize));
  };

  const startOffset = useSharedValue(0);
  const thumbSize = 40;
  const maxOffset = sliderHeight - thumbSize;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startOffset.value = sliderOffset.value;
    })
    .onUpdate((e) => {
      const newOffset = Math.max(0, Math.min(maxOffset, startOffset.value + e.translationY));
      sliderOffset.value = newOffset;
      runOnJS(updateFontSize)(newOffset);
    });

  const cycleColor = () => {
    const nextIndex = (colorIndex + 1) % COLORS.length;
    setColorIndex(nextIndex);
    setColor(COLORS[nextIndex]);
  };

  const cycleAlignment = () => {
    const alignments: ("left" | "center" | "right")[] = ["left", "center", "right"];
    const currentIdx = alignments.indexOf(textAlign);
    setTextAlign(alignments[(currentIdx + 1) % alignments.length]);
  };

  const getAlignIcon = () => {
    if (textAlign === "left") return { widths: [16, 12, 14], align: "flex-start" as const };
    if (textAlign === "center") return { widths: [12, 16, 10], align: "center" as const };
    return { widths: [16, 12, 14], align: "flex-end" as const };
  };

  const sliderThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sliderOffset.value }],
  }));

  const handleSave = () => {
    onSave({
      text,
      fontSize,
      color,
      backgroundColor: backgroundColor === "transparent" ? undefined : backgroundColor,
      fontFamily,
      textAlign,
      fontStyle: isItalic ? "italic" : "normal",
      textDecorationLine: isUnderline ? "underline" : "none",
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Background/Canvas Area */}
        <View style={styles.canvasArea}>
          {/* Text Input Area */}
          <TextInput
            style={[
              styles.textInput,
              {
                fontSize,
                color,
                backgroundColor,
                fontFamily,
                textAlign,
                fontStyle: isItalic ? "italic" : "normal",
                textDecorationLine: isUnderline ? "underline" : "none",
              },
            ]}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholder="Start typing..."
            placeholderTextColor="rgba(255,255,255,0.5)"
          />
        </View>

        {/* Size Slider - Left Side */}
        <View style={styles.sizeSliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={styles.sliderTrackLine} />
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.sliderThumb, sliderThumbStyle]}>
                <View style={styles.sliderThumbInner} />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View />
          <Pressable style={styles.doneButton} onPress={handleSave}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        {/* Bottom Toolbar */}
        <View style={styles.bottomToolbar}>
          {/* Font Styles - only when Aa is selected */}
          {showFonts && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.fontScrollContainer}
              contentContainerStyle={styles.fontScrollContent}
            >
              {FONTS.map((font) => (
                <Pressable
                  key={font.name}
                  style={[
                    styles.fontButton,
                    fontFamily === font.value && styles.fontButtonActive,
                  ]}
                  onPress={() => setFontFamily(font.value)}
                >
                  <Text
                    style={[
                      styles.fontButtonText,
                      fontFamily === font.value && styles.fontButtonTextActive,
                      { fontFamily: font.value },
                    ]}
                  >
                    {font.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Format Options (Italic / Underline) */}
          {showFormatBubbles && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.fontScrollContainer}
              contentContainerStyle={styles.fontScrollContent}
            >
              <Pressable
                style={[styles.fontButton, isItalic && styles.fontButtonActive]}
                onPress={() => setIsItalic(!isItalic)}
              >
                <Text style={[styles.fontButtonText, { fontStyle: "italic" }, isItalic && styles.fontButtonTextActive]}>Italic</Text>
              </Pressable>
              <Pressable
                style={[styles.fontButton, isUnderline && styles.fontButtonActive]}
                onPress={() => setIsUnderline(!isUnderline)}
              >
                <Text style={[styles.fontButtonText, { textDecorationLine: "underline" }, isUnderline && styles.fontButtonTextActive]}>Underline</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* Text Color Picker */}
          {showColorPicker && (
            <View style={styles.colorPicker}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorPickerContent}
              >
                {COLORS.map((col) => (
                  <Pressable
                    key={col}
                    style={[
                      styles.colorOption,
                      { backgroundColor: col },
                      color === col && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(col)}
                  >
                    {color === col && (
                      <View style={styles.colorCheckmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Highlight Color Picker */}
          {showHighlightPicker && (
            <View style={styles.colorPicker}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorPickerContent}
              >
                <Pressable
                  style={[
                    styles.colorOption,
                    { backgroundColor: "transparent", borderWidth: 1, borderColor: "#FFF" },
                    backgroundColor === "transparent" && styles.colorOptionSelected,
                  ]}
                  onPress={() => setBackgroundColor("transparent")}
                >
                  <Text style={styles.noneText}>∅</Text>
                </Pressable>
                {COLORS.map((col) => (
                  <Pressable
                    key={col}
                    style={[
                      styles.colorOption,
                      { backgroundColor: col },
                      backgroundColor === col && styles.colorOptionSelected,
                    ]}
                    onPress={() => setBackgroundColor(col)}
                  >
                    {backgroundColor === col && (
                      <View style={styles.colorCheckmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Icon Toolbar */}
          <View style={styles.iconToolbar}>
            {/* Aa - toggles font picker */}
            <Pressable
              style={[styles.iconButton, showFonts && styles.iconButtonActive]}
              onPress={() => {
                setShowFonts(!showFonts);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
                setShowFormatBubbles(false);
              }}
            >
              <Text style={styles.iconText}>Aa</Text>
            </Pressable>

            {/* Color Picker Button */}
            <Pressable
              style={[styles.iconButton, showColorPicker && styles.iconButtonActive]}
              onPress={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
                setShowFonts(false);
                setShowFormatBubbles(false);
              }}
            >
              <View style={[styles.colorIndicator, { backgroundColor: color }]} />
            </Pressable>

            {/* Text Highlight Button */}
            <Pressable
              style={[styles.iconButton, showHighlightPicker && styles.iconButtonActive]}
              onPress={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
                setShowFonts(false);
                setShowFormatBubbles(false);
              }}
            >
              <View style={styles.highlightIcon}>
                <Text style={styles.iconText}>A</Text>
                <View
                  style={[
                    styles.highlightBar,
                    {
                      backgroundColor:
                        backgroundColor === "transparent" ? "#888" : backgroundColor,
                    },
                  ]}
                />
              </View>
            </Pressable>

            {/* Alignment - single cycling button */}
            <Pressable style={styles.iconButton} onPress={cycleAlignment}>
              <View style={styles.alignIcon}>
                {getAlignIcon().widths.map((w, i) => (
                  <View key={i} style={[styles.alignLine, { width: w, alignSelf: getAlignIcon().align }]} />
                ))}
              </View>
            </Pressable>

            {/* Underline/Format - shows top bubbles */}
            <Pressable
              style={[styles.iconButton, showFormatBubbles && styles.iconButtonActive]}
              onPress={() => {
                setShowFormatBubbles(!showFormatBubbles);
                setShowColorPicker(false);
                setShowFonts(false);
                setShowHighlightPicker(false);
              }}
            >
              <Text style={[styles.iconText, { textDecorationLine: "underline" }]}>U</Text>
            </Pressable>

            {/* Effects Button */}
            <Pressable style={styles.iconButton}>
              <Text style={styles.iconText}>✨</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  canvasArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
  },
  textInput: {
    width: "100%",
    minHeight: 60,
    maxHeight: SCREEN_HEIGHT * 0.6,
    padding: 16,
    borderRadius: 8,
  },
  sizeSliderContainer: {
    position: "absolute",
    left: 20,
    top: "20%",
    bottom: "20%",
    justifyContent: "center",
    alignItems: "center",
  },
  sliderTrack: {
    height: "60%",
    width: 40,
    justifyContent: "flex-start",
    alignItems: "center",
    position: "relative",
  },
  sliderTrackLine: {
    width: 4,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    position: "absolute",
  },
  sliderThumb: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderThumbInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topBar: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomToolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingBottom: 20,
  },
  fontScrollContainer: {
    maxHeight: 60,
  },
  fontScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  fontButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  fontButtonActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  fontButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  fontButtonTextActive: {
    color: "#000000",
  },
  iconToolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  iconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  highlightIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  highlightBar: {
    width: 20,
    height: 6,
    marginTop: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  alignIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
  },
  alignLine: {
    height: 2,
    backgroundColor: "#FFFFFF",
    marginVertical: 2,
    borderRadius: 1,
  },
  colorPicker: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  colorPickerContent: {
    gap: 12,
    paddingHorizontal: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  colorCheckmark: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noneText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
  },
  iconButtonActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
});
