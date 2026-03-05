import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppBlueprintSchema } from "../types";
import type { AppBlueprint, BlueprintMeta } from "../types";
import type { StorageProvider } from "./StorageProvider";

// Storage keys kept unchanged for backward compatibility
const BLUEPRINT_LIST_KEY = "project_list";

function blueprintKey(blueprintId: string) {
  return `project_blueprint_${blueprintId}`;
}

function runtimeVarsKey(blueprintId: string) {
  return `runtime_persisted_variables_${blueprintId}`;
}

export class AsyncStorageProvider implements StorageProvider {
  async listBlueprints(): Promise<BlueprintMeta[]> {
    const raw = await AsyncStorage.getItem(BLUEPRINT_LIST_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as BlueprintMeta[];
    } catch {
      return [];
    }
  }

  async saveBlueprintList(blueprints: BlueprintMeta[]): Promise<void> {
    await AsyncStorage.setItem(BLUEPRINT_LIST_KEY, JSON.stringify(blueprints));
  }

  async loadBlueprint(blueprintId: string): Promise<AppBlueprint | null> {
    const raw = await AsyncStorage.getItem(blueprintKey(blueprintId));
    if (!raw) return null;
    try {
      const parsed = AppBlueprintSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async saveBlueprint(blueprintId: string, blueprint: AppBlueprint): Promise<void> {
    await AsyncStorage.setItem(blueprintKey(blueprintId), JSON.stringify(blueprint));
  }

  async deleteBlueprint(blueprintId: string): Promise<void> {
    await AsyncStorage.multiRemove([
      blueprintKey(blueprintId),
      runtimeVarsKey(blueprintId),
    ]);
    const blueprints = await this.listBlueprints();
    const updated = blueprints.filter((b) => b.id !== blueprintId);
    await this.saveBlueprintList(updated);
  }
}
