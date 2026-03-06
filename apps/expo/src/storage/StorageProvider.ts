import type { AppSlate, SlateMeta, ShareInfo } from "../types";
import type { HistoryEntry } from "../hooks/useUndoHistory";

export interface PersistedHistory {
  entries: HistoryEntry[];
  currentId: string;
  redoMap: [string, string][];
}

export interface StorageProvider {
  listSlates(): Promise<SlateMeta[]>;
  saveSlateList(slates: SlateMeta[]): Promise<void>;
  loadSlate(slateId: string): Promise<AppSlate | null>;
  saveSlate(slateId: string, slate: AppSlate): Promise<void>;
  deleteSlate(slateId: string): Promise<void>;
  saveHistory(slateId: string, history: PersistedHistory): Promise<void>;
  loadHistory(slateId: string): Promise<PersistedHistory | null>;
}

export type CollabEventHandler = (slate: AppSlate, senderId: string) => void;
export type PresenceHandler = (users: { userId: string }[]) => void;

export interface SyncableStorageProvider extends StorageProvider {
  initialize(): Promise<void>;
  syncAll(): Promise<void>;
  getConnectionStatus(): 'online' | 'offline' | 'syncing';

  // Sharing
  createShareLink(slateId: string, role: 'viewer' | 'editor'): Promise<ShareInfo>;
  revokeShareLink(shareCode: string): Promise<void>;
  listShareLinks(slateId: string): Promise<ShareInfo[]>;
  loadSharedSlate(shareCode: string): Promise<{ slate: AppSlate; role: 'viewer' | 'editor'; slateId: string } | null>;

  // Collaboration
  joinCollabChannel(slateId: string, onChange: CollabEventHandler, onPresence: PresenceHandler): void;
  leaveCollabChannel(slateId: string): void;
  broadcastSlateChange(slateId: string, slate: AppSlate): void;
}
