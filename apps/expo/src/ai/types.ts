export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** If the assistant message contains parseable component JSON */
  hasComponentJson?: boolean;
  timestamp: number;
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
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
