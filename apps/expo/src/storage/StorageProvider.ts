import type { AppBlueprint } from "../types";

export interface StorageProvider {
  loadBlueprint(): Promise<AppBlueprint | null>;
  saveBlueprint(blueprint: AppBlueprint): Promise<void>;
}
