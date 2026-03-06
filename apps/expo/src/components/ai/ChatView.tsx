import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../ai/types";

interface ChatViewProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onApply?: (message: ChatMessageType) => void;
  onClear?: () => void;
  placeholder?: string;
  /** Header actions rendered above the chat */
  headerActions?: React.ReactNode;
  /** Custom per-message action renderer. If provided, replaces the default Apply button. */
  renderMessageActions?: (message: ChatMessageType) => React.ReactNode;
}

export function ChatView({
  messages,
  isLoading,
  error,
  onSend,
  onApply,
  onClear,
  placeholder = "Describe what you want...",
  headerActions,
  renderMessageActions,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
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

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {messages.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={32} color="#222" />
            <Text style={styles.emptyText}>Start a conversation</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id}>
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
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#555" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={14} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    color: "#444",
    fontSize: 13,
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
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1a1a1a",
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
});
