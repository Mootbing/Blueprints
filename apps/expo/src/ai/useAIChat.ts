import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildContent } from "./anthropicClient";
import type { ChatMessage, AnthropicMessage } from "./types";
import { uuid } from "../utils/uuid";

const MAX_PERSISTED_MESSAGES = 20;

interface UseAIChatOptions {
  /** AsyncStorage key for persisting messages */
  storageKey?: string;
  /** Called for each user message to get AI response */
  sendFn: (messages: AnthropicMessage[]) => Promise<string>;
  /** Check if response has actionable JSON */
  hasActionableContent?: (text: string) => boolean;
}

export function useAIChat({ storageKey, sendFn, hasActionableContent }: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendFnRef = useRef(sendFn);
  sendFnRef.current = sendFn;
  const hasActionableRef = useRef(hasActionableContent);
  hasActionableRef.current = hasActionableContent;

  // Load persisted messages
  useEffect(() => {
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as ChatMessage[];
          setMessages(parsed.slice(-MAX_PERSISTED_MESSAGES));
        } catch {}
      }
    });
  }, [storageKey]);

  // Persist messages
  const persistMessages = useCallback(
    (msgs: ChatMessage[]) => {
      if (!storageKey) return;
      const toSave = msgs.slice(-MAX_PERSISTED_MESSAGES);
      AsyncStorage.setItem(storageKey, JSON.stringify(toSave)).catch(() => {});
    },
    [storageKey],
  );

  const sendMessage = useCallback(
    async (text: string, images?: string[]) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: text.trim(),
        images: images && images.length > 0 ? images : undefined,
        timestamp: Date.now(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);
      setError(null);

      try {
        // Build conversation for API (with multimodal content blocks for images)
        const apiMessages: AnthropicMessage[] = newMessages.map((m) => ({
          role: m.role,
          content: m.images ? buildContent(m.content, m.images) : m.content,
        }));

        const response = await sendFnRef.current(apiMessages);

        const assistantMsg: ChatMessage = {
          id: uuid(),
          role: "assistant",
          content: response,
          hasComponentJson: hasActionableRef.current?.(response) ?? false,
          timestamp: Date.now(),
        };

        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        persistMessages(updatedMessages);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, persistMessages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    if (storageKey) {
      AsyncStorage.removeItem(storageKey).catch(() => {});
    }
  }, [storageKey]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    setMessages,
  };
}
