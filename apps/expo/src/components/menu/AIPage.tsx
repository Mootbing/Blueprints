import React, { useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { crossAlert } from "../../utils/crossAlert";
import { Feather } from "@expo/vector-icons";
import { ChatView } from "../ai/ChatView";
import { useAIChat } from "../../ai/useAIChat";
import { generateScreenChat, parseComponentArray } from "../../ai/generateScreen";
import { containsComponentJson } from "../../ai/parseResponse";
import { tidyLayout } from "../../ai/tidyLayout";
import type { Component, Theme, Screen } from "../../types";
import { summarizeResponse } from "../../ai/useChatLog";
import type { ChatLogEntry } from "../../ai/useChatLog";
import type { ChatMessage } from "../../ai/types";

interface AIPageProps {
  width: number;
  screen: Screen;
  apiKey: string;
  theme?: Theme;
  slateId: string;
  onApplyComponents: (components: Component[], mode: "replace" | "add") => void;
  onTidy: () => void;
  isTidying: boolean;
  logInteraction?: (entry: Omit<ChatLogEntry, "id" | "timestamp">) => void;
}

export function AIPage({
  width,
  screen,
  apiKey,
  theme,
  slateId,
  onApplyComponents,
  onTidy,
  isTidying,
  logInteraction,
}: AIPageProps) {
  const sendFn = useCallback(
    async (messages: Array<{ role: "user" | "assistant"; content: string }>) => {
      if (!apiKey) throw new Error("Please set your API key in Settings first");
      return generateScreenChat(apiKey, messages, theme);
    },
    [apiKey, theme],
  );

  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat({
    storageKey: `ai_chat_${slateId}_${screen.id}`,
    sendFn,
    hasActionableContent: containsComponentJson,
  });

  // Log new assistant messages to chat history for agent context
  const lastLoggedCount = useRef(0);
  useEffect(() => {
    if (messages.length <= lastLoggedCount.current) return;
    const newMsgs = messages.slice(lastLoggedCount.current);
    lastLoggedCount.current = messages.length;
    for (const msg of newMsgs) {
      if (msg.role !== "assistant") continue;
      const userMsg = [...messages].slice(0, messages.indexOf(msg)).reverse().find((m) => m.role === "user");
      if (userMsg && logInteraction) {
        logInteraction({
          source: "screen",
          context: screen.name,
          screenId: screen.id,
          userMessage: userMsg.content,
          assistantSummary: summarizeResponse(msg.content),
        });
      }
    }
  }, [messages, logInteraction, screen.name, screen.id]);

  const handleApply = useCallback(
    (msg: ChatMessage) => {
      try {
        const components = parseComponentArray(msg.content);
        const hasExisting = screen.components.length > 1; // >1 because background

        if (!hasExisting) {
          onApplyComponents(components, "replace");
          return;
        }

        crossAlert(
          "Apply Components",
          "This screen already has components.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Replace All",
              style: "destructive",
              onPress: () => onApplyComponents(components, "replace"),
            },
            {
              text: "Add to Screen",
              onPress: () => onApplyComponents(components, "add"),
            },
          ],
        );
      } catch (err) {
        crossAlert("Error", err instanceof Error ? err.message : "Failed to parse components");
      }
    },
    [screen.components, onApplyComponents],
  );

  const hasKey = !!apiKey;

  return (
    <View style={[styles.page, { width }]}>
      {!hasKey ? (
        <View style={styles.noKeyContainer}>
          <Feather name="key" size={32} color="#222" />
          <Text style={styles.noKeyTitle}>API Key Required</Text>
          <Text style={styles.noKeyText}>
            Go to Settings tab and add your Anthropic API key to use AI features.
          </Text>
        </View>
      ) : (
        <ChatView
          messages={messages}
          isLoading={isLoading || isTidying}
          error={error}
          onSend={sendMessage}
          onApply={handleApply}
          onClear={clearMessages}
          placeholder="Describe a screen (e.g., login page)..."
          headerActions={
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  (isTidying || isLoading) && styles.actionBtnDisabled,
                  pressed && !isTidying && !isLoading && styles.actionBtnPressed,
                ]}
                onPress={onTidy}
                disabled={isTidying || isLoading}
              >
                <Feather name="grid" size={14} color="#555" />
                <Text style={styles.actionBtnText}>
                  {isTidying ? "Tidying..." : "Tidy Layout"}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={clearMessages}
              >
                <Feather name="trash-2" size={14} color="#e54" />
                <Text style={[styles.actionBtnText, styles.clearBtnText]}>Clear Chat</Text>
              </Pressable>
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  noKeyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 12,
  },
  noKeyTitle: {
    color: "#ccc",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  noKeyText: {
    color: "#444",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnPressed: {
    backgroundColor: "#1a1a1a",
  },
  actionBtnText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
  clearBtnText: {
    color: "#e54",
  },
});
