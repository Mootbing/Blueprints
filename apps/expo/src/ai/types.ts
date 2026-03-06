export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Base64 data URIs attached to this message */
  images?: string[];
  /** If the assistant message contains parseable component JSON */
  hasComponentJson?: boolean;
  /** History entry ID for the auto-created branch (created on AI response) */
  branchEntryId?: string;
  /** Extended thinking / reasoning text from the model */
  thinking?: string;
  /** Cryptographic signature for the thinking block (needed for multi-turn) */
  thinkingSignature?: string;
  timestamp: number;
}

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string | AnthropicContentBlock[] }>;
}

export interface AnthropicResponse {
  id: string;
  content: Array<{ type: "text"; text: string }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export interface AnthropicError {
  type: "error";
  error: { type: string; message: string };
}

export type AIMode = "tidy" | "generate" | "modify" | "workflow";

export type AgentStatus = "idle" | "running" | "awaiting_review" | "accepted" | "rejected";

export interface AgentSession {
  id: string;
  name: string;
  status: AgentStatus;
  createdAt: number;
  /** History entry ID created when agent applied changes */
  branchEntryId?: string;
  messages: ChatMessage[];
}
