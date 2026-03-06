import type { AppSlate, SlateMeta } from "../types";
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
