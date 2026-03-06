import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SpotlightOverlay } from "../SpotlightOverlay";
import * as ImagePicker from "expo-image-picker";
import { useAIChat } from "../../ai/useAIChat";
import { modifyComponentChat } from "../../ai/modifyComponent";
import { containsComponentJson } from "../../ai/parseResponse";
import { parseSingleComponent } from "../../ai/modifyComponent";
import { getComponentLabel } from "../../utils/componentTree";
import type { Component, Theme } from "../../types";
import { summarizeResponse } from "../../ai/useChatLog";
import type { ChatMessage, AnthropicMessage } from "../../ai/types";

interface ComponentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AIChatSheetProps {
  visible: boolean;
  component: Component;
  slateId: string;
  theme?: Theme;
  componentRect?: ComponentRect;
  onApply: (component: Component) => void;
  onClose: () => void;
  logInteraction?: (entry: { source: "component" | "screen"; context: string; screenId: string; userMessage: string; assistantSummary: string }) => void;
  screenId?: string;
}

export function AIChatSheet({
  visible,
  component,
  slateId,
  theme,
  componentRect,
  onApply,
  onClose,
  logInteraction,
  screenId,
}: AIChatSheetProps) {
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appliedRef = useRef(false);

  const sendFn = useCallback(
    async (messages: AnthropicMessage[]) => {
      return modifyComponentChat(slateId, component, messages, theme);
    },
    [slateId, component, theme],
  );

  const { messages, isLoading, error, sendMessage } = useAIChat({
    sendFn,
    hasActionableContent: containsComponentJson,
  });

  const label = useMemo(
    () => getComponentLabel(component, { includeType: true }),
    [component],
  );

  // Auto-apply when AI responds with component JSON
  useEffect(() => {
    if (appliedRef.current || isLoading) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.hasComponentJson) return;
    try {
      const parsed = parseSingleComponent(lastMsg.content);
      const updated = { ...parsed, id: component.id };
      appliedRef.current = true;
      onApply(updated);
      // Log to chat history for agent context
      const userMsg = [...messages].reverse().find((m) => m.role === "user");
      if (userMsg && logInteraction) {
        logInteraction({
          source: "component",
          context: label,
          screenId: screenId ?? "",
          userMessage: userMsg.content,
          assistantSummary: summarizeResponse(lastMsg.content),
        });
      }
    } catch {}
  }, [messages, isLoading, component.id, onApply, logInteraction, screenId, label]);

  useEffect(() => {
    if (visible) {
      appliedRef.current = false;
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(200);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    appliedRef.current = false;
    sendMessage(input.trim(), pendingImages.length > 0 ? pendingImages : undefined);
    setInput("");
    setPendingImages([]);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets
        .filter((a) => a.base64)
        .map((a) => `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`);
      setPendingImages((prev) => [...prev, ...uris]);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 200,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleBlurPress = () => {
    if (!appliedRef.current) handleClose();
  };

  if (!visible) return null;

  const stripJson = (content: string) =>
    content.replace(/<json>[\s\S]*?<\/json>/g, "").trim();

  const PAD = 8;
  const r = componentRect;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {r ? (
        <SpotlightOverlay rect={r} blur onPressDim={handleBlurPress} />
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBlurPress} />
      )}

      {/* Floating messages */}
      <View style={styles.messagesArea} pointerEvents="box-none">
        <ScrollView
          ref={scrollRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => {
            const text = stripJson(msg.content);
            const isUser = msg.role === "user";
            return (
              <View
                key={msg.id}
                style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}
              >
                <View
                  style={[
                    styles.glassBubble,
                    isUser ? styles.glassUser : styles.glassAI,
                  ]}
                >
                  {msg.images && msg.images.length > 0 && (
                    <View style={styles.msgImageRow}>
                      {msg.images.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={styles.msgImage} resizeMode="cover" />
                      ))}
                    </View>
                  )}
                  {text.length > 0 && (
                    <Text style={[styles.msgText, isUser && styles.msgTextUser]}>
                      {text}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {isLoading && (
            <View style={[styles.msgRow, styles.msgRowAI]}>
              <View style={[styles.glassBubble, styles.glassAI]}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
              </View>
            </View>
          )}

          {error && (
            <View style={[styles.msgRow, styles.msgRowAI]}>
              <View style={[styles.glassBubble, styles.glassError]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Small input from the bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inputWrapper}
      >
        <Animated.View
          style={[
            styles.inputContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.inputHeader}>
            <View style={styles.inputHeaderLeft}>
              <Feather name="zap" size={14} color="#555" />
              <Text style={styles.inputLabel} numberOfLines={1}>{label}</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
          {pendingImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingImageRow} contentContainerStyle={styles.pendingImageRowContent}>
              {pendingImages.map((uri, i) => (
                <View key={i} style={styles.pendingImageWrap}>
                  <Image source={{ uri }} style={styles.pendingImage} resizeMode="cover" />
                  <Pressable style={styles.pendingImageRemove} onPress={() => removePendingImage(i)} hitSlop={8}>
                    <Feather name="x" size={10} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.inputRow}>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
              onPress={handlePickImage}
              disabled={isLoading}
              hitSlop={8}
            >
              <Feather name="image" size={14} color={isLoading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Describe a change..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              maxLength={2000}
              returnKeyType="default"
              blurOnSubmit={false}
              editable={!isLoading}
              autoFocus
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!input.trim() || isLoading) && styles.sendBtnDisabled,
                pressed && input.trim() && !isLoading && styles.sendBtnPressed,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Feather
                name="arrow-up"
                size={16}
                color={input.trim() && !isLoading ? "#000" : "rgba(255,255,255,0.2)"}
              />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  messagesArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  messageScroll: {
    maxHeight: Dimensions.get("window").height * 0.5,
  },
  messageScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 40,
    gap: 8,
  },
  msgRow: {
    flexDirection: "row",
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAI: {
    justifyContent: "flex-start",
  },
  glassBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  glassUser: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "#333",
  },
  glassAI: {
    backgroundColor: "#0a0a0a",
    borderColor: "#1a1a1a",
  },
  glassError: {
    backgroundColor: "#111",
    borderColor: "#1a1a1a",
  },
  msgText: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextUser: {
    color: "#fff",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
  },
  inputWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputContainer: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 34 : 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  inputHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  inputLabel: {
    color: "#444",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  attachBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    color: "#ccc",
    fontSize: 15,
    paddingHorizontal: 6,
    paddingTop: Platform.OS === "ios" ? 6 : 4,
    paddingBottom: Platform.OS === "ios" ? 6 : 4,
    maxHeight: 80,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#111",
  },
  sendBtnPressed: {
    backgroundColor: "#ccc",
  },
  msgImageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  msgImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
  },
  pendingImageRow: {
    marginHorizontal: 12,
    marginBottom: 6,
    maxHeight: 52,
  },
  pendingImageRowContent: {
    gap: 6,
  },
  pendingImageWrap: {
    position: "relative",
  },
  pendingImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#1a1a1a",
  },
  pendingImageRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
});
