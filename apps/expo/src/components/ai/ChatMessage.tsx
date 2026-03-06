import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import type { ChatMessage as ChatMessageType } from "../../ai/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Strip <json>...</json> blocks from display text
  const displayText = message.content
    .replace(/<json>[\s\S]*?<\/json>/g, "")
    .trim();

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {displayText.length > 0 && (
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {displayText}
          </Text>
        )}
        {message.hasComponentJson && (
          <View style={styles.jsonBadge}>
            <Text style={styles.jsonBadgeText}>Contains changes</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#fff",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#000",
  },
  assistantText: {
    color: "#ccc",
  },
  jsonBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    alignSelf: "flex-start",
  },
  jsonBadgeText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
