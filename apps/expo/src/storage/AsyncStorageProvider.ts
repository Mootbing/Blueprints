import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppBlueprintSchema } from "../types";
import type { AppBlueprint } from "../types";
import type { StorageProvider } from "./StorageProvider";

const BLUEPRINT_KEY = "app_blueprint";

export class AsyncStorageProvider implements StorageProvider {
  async loadBlueprint(): Promise<AppBlueprint | null> {
    const raw = await AsyncStorage.getItem(BLUEPRINT_KEY);
    if (!raw) return null;
    const parsed = AppBlueprintSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async saveBlueprint(blueprint: AppBlueprint): Promise<void> {
    await AsyncStorage.setItem(BLUEPRINT_KEY, JSON.stringify(blueprint));
  }
}
