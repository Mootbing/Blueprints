import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppSlateSchema } from "../types";
import type { AppSlate, SlateMeta } from "../types";
import type { StorageProvider, PersistedHistory } from "./StorageProvider";

// Storage keys kept unchanged for backward compatibility
const SLATE_LIST_KEY = "project_list";

function slateKey(slateId: string) {
  return `project_slate_${slateId}`;
}

function runtimeVarsKey(slateId: string) {
  return `runtime_persisted_variables_${slateId}`;
}

function historyKey(slateId: string) {
  return `undo_history_${slateId}`;
}

export class AsyncStorageProvider implements StorageProvider {
  async listSlates(): Promise<SlateMeta[]> {
    const raw = await AsyncStorage.getItem(SLATE_LIST_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SlateMeta[];
    } catch {
      return [];
    }
  }

  async saveSlateList(slates: SlateMeta[]): Promise<void> {
    await AsyncStorage.setItem(SLATE_LIST_KEY, JSON.stringify(slates));
  }

  async loadSlate(slateId: string): Promise<AppSlate | null> {
    const raw = await AsyncStorage.getItem(slateKey(slateId));
    if (!raw) return null;
    try {
      const parsed = AppSlateSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async saveSlate(slateId: string, slate: AppSlate): Promise<void> {
    await AsyncStorage.setItem(slateKey(slateId), JSON.stringify(slate));
  }

  async deleteSlate(slateId: string): Promise<void> {
    await AsyncStorage.multiRemove([
      slateKey(slateId),
      runtimeVarsKey(slateId),
      historyKey(slateId),
    ]);
    const slates = await this.listSlates();
    const updated = slates.filter((b) => b.id !== slateId);
    await this.saveSlateList(updated);
  }

  async saveHistory(slateId: string, history: PersistedHistory): Promise<void> {
    await AsyncStorage.setItem(historyKey(slateId), JSON.stringify(history));
  }

  async loadHistory(slateId: string): Promise<PersistedHistory | null> {
    const raw = await AsyncStorage.getItem(historyKey(slateId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedHistory;
    } catch {
      return null;
    }
  }
}
