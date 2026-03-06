import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../ai/types";

interface ChatViewProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  onSend: (text: string, images?: string[]) => void;
  onApply?: (message: ChatMessageType) => void;
  placeholder?: string;
  /** Header actions rendered above the chat */
  headerActions?: React.ReactNode;
  /** Custom per-message action renderer. If provided, replaces the default Apply button. */
  renderMessageActions?: (message: ChatMessageType) => React.ReactNode;
  /** Pre-fill the input field */
  initialText?: string;
  /** Automatically send initialText on mount (when no messages exist) */
  autoSend?: boolean;
  /** Live streaming thinking text from the agent */
  streamingThinking?: string | null;
}

const keyExtractor = (item: ChatMessageType) => item.id;

export function ChatView({
  messages,
  isLoading,
  error,
  onSend,
  onApply,
  placeholder = "Describe what you want...",
  headerActions,
  renderMessageActions,
  initialText,
  autoSend,
  streamingThinking,
}: ChatViewProps) {
  const [input, setInput] = useState(initialText ?? "");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const listRef = useRef<FlatList>(null);
  const didAutoSend = useRef(false);

  useEffect(() => {
    if (initialText) setInput(initialText);
  }, [initialText]);

  // Auto-send initialText when autoSend is true and no messages exist yet
  useEffect(() => {
    if (autoSend && initialText?.trim() && messages.length === 0 && !didAutoSend.current) {
      didAutoSend.current = true;
      onSend(initialText.trim());
      setInput("");
    }
  }, [autoSend, initialText, messages.length, onSend]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages or streaming thinking updates
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading, streamingThinking]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), pendingImages.length > 0 ? pendingImages : undefined);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 80}
    >
      {headerActions && (
        <View style={styles.headerActions}>{headerActions}</View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={({ item: msg }) => (
          <View>
            <ChatMessage message={msg} />
            {msg.role === "assistant" && (
              renderMessageActions ? renderMessageActions(msg) : (
                msg.hasComponentJson && onApply && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.applyBtn,
                      pressed && styles.applyBtnPressed,
                    ]}
                    onPress={() => onApply(msg)}
                  >
                    <Feather name="check-circle" size={14} color="#000" />
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </Pressable>
                )
              )
            )}
          </View>
        )}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={32} color="#222" />
              <Text style={styles.emptyText}>Start a conversation</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#555" />
                  <Text style={styles.loadingText}>
                    {streamingThinking ? "Reasoning..." : "Processing on server..."}
                  </Text>
                </View>
                {streamingThinking ? (
                  <Text style={styles.streamingThinkingText}>
                    {streamingThinking}
                  </Text>
                ) : null}
              </View>
            )}
            {error && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        }
      />

      <View style={styles.inputBar}>
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
            <Feather name="image" size={18} color={isLoading ? "#222" : "#555"} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={placeholder}
            placeholderTextColor="#333"
            multiline
            maxLength={2000}
            returnKeyType="default"
            blurOnSubmit={false}
            editable={!isLoading}
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
              name="send"
              size={18}
              color={input.trim() && !isLoading ? "#000" : "#333"}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: "#333",
    fontSize: 14,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#444",
    fontSize: 13,
  },
  streamingThinkingText: {
    color: "#333",
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
    paddingLeft: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    flex: 1,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginLeft: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  applyBtnPressed: {
    backgroundColor: "#ccc",
  },
  applyBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1a1a1a",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 12,
    color: "#ccc",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  pendingImageRow: {
    marginBottom: 8,
    maxHeight: 68,
  },
  pendingImageRowContent: {
    gap: 8,
  },
  pendingImageWrap: {
    position: "relative",
  },
  pendingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
  },
  pendingImageRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
});
