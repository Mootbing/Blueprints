import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ChatMessage as ChatMessageType } from "../../ai/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  // Strip <json>...</json> blocks from display text
  const displayText = message.content
    .replace(/<json>[\s\S]*?<\/json>/g, "")
    .trim();

  const images = message.images;
  const thinking = message.thinking;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Thinking / reasoning (shown above the bubble) */}
      {!isUser && thinking && (
        <Pressable
          style={styles.thinkingContainer}
          onPress={() => setThinkingExpanded((v) => !v)}
        >
          <View style={styles.thinkingHeader}>
            <Feather
              name={thinkingExpanded ? "chevron-down" : "chevron-right"}
              size={10}
              color="#444"
            />
            <Text style={styles.thinkingLabel}>Reasoning</Text>
          </View>
          <Text
            style={styles.thinkingText}
            numberOfLines={thinkingExpanded ? undefined : 2}
          >
            {thinking}
          </Text>
        </Pressable>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {images && images.length > 0 && (
          <View style={styles.imageRow}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.attachedImage} resizeMode="cover" />
            ))}
          </View>
        )}
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
  thinkingContainer: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 2,
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  thinkingLabel: {
    color: "#333",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  thinkingText: {
    color: "#444",
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
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
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  attachedImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
  },
});
