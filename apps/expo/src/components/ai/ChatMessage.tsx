import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import Markdown from "react-native-markdown-display";
import type { ChatMessage as ChatMessageType } from "../../ai/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = React.memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
        <View style={styles.thinkingContainer}>
          <View style={styles.thinkingHeader}>
            <Text style={styles.thinkingLabel}>Reasoning</Text>
          </View>
          <Text style={styles.thinkingText}>
            {thinking}
          </Text>
        </View>
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
          isUser ? (
            <Text style={[styles.text, styles.userText]}>
              {displayText}
            </Text>
          ) : (
            <Markdown style={markdownStyles}>
              {displayText}
            </Markdown>
          )
        )}
        {message.hasComponentJson && (
          <View style={styles.jsonBadge}>
            <Text style={styles.jsonBadgeText}>Contains changes</Text>
          </View>
        )}
      </View>
    </View>
  );
}, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content
);

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

const markdownStyles = StyleSheet.create({
  body: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
  },
  heading1: {
    color: "#eee",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  heading2: {
    color: "#eee",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  heading3: {
    color: "#eee",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 2,
  },
  strong: {
    color: "#eee",
    fontWeight: "700",
  },
  em: {
    color: "#ccc",
    fontStyle: "italic",
  },
  code_inline: {
    backgroundColor: "#1a1a1a",
    color: "#e06c75",
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  fence: {
    backgroundColor: "#1a1a1a",
    color: "#ccc",
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginVertical: 6,
  },
  code_block: {
    backgroundColor: "#1a1a1a",
    color: "#ccc",
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginVertical: 6,
  },
  blockquote: {
    backgroundColor: "transparent",
    borderLeftWidth: 3,
    borderLeftColor: "#444",
    paddingLeft: 10,
    marginVertical: 4,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: "#61afef",
    textDecorationLine: "underline",
  },
  hr: {
    backgroundColor: "#333",
    height: 1,
    marginVertical: 8,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
});
