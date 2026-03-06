import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
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

  const images = message.images;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
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
