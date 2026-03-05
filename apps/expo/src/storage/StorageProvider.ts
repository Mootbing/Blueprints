import type { AppBlueprint, BlueprintMeta } from "../types";

export interface StorageProvider {
  listBlueprints(): Promise<BlueprintMeta[]>;
  saveBlueprintList(blueprints: BlueprintMeta[]): Promise<void>;
  loadBlueprint(blueprintId: string): Promise<AppBlueprint | null>;
  saveBlueprint(blueprintId: string, blueprint: AppBlueprint): Promise<void>;
  deleteBlueprint(blueprintId: string): Promise<void>;
}
