import React, { useState, useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HomeScreen } from "./src/components/HomeScreen";
import { BlueprintEditor, defaultBlueprint } from "./src/components/BlueprintEditor";
import { AsyncStorageProvider } from "./src/storage";
import type { StorageProvider } from "./src/storage";
import type { BlueprintMeta } from "./src/types";
import { uuid } from "./src/utils/uuid";

const storage: StorageProvider = new AsyncStorageProvider();

type Route =
  | { screen: "home" }
  | { screen: "editor"; blueprintId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: "home" });
  const [blueprintList, setBlueprintList] = useState<BlueprintMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load blueprint list on startup with legacy migration
  useEffect(() => {
    (async () => {
      try {
        let bpList = await storage.listBlueprints();

        // Legacy migration: old single-blueprint key
        if (bpList.length === 0) {
          const legacyBlueprint = await AsyncStorage.getItem("app_blueprint");
          if (legacyBlueprint) {
            const migrationId = uuid();
            const meta: BlueprintMeta = {
              id: migrationId,
              name: "My Blueprint",
              createdAt: Date.now(),
            };
            await AsyncStorage.setItem(
              `project_blueprint_${migrationId}`,
              legacyBlueprint
            );
            const legacyVars = await AsyncStorage.getItem("runtime_persisted_variables");
            if (legacyVars) {
              await AsyncStorage.setItem(
                `runtime_persisted_variables_${migrationId}`,
                legacyVars
              );
              await AsyncStorage.removeItem("runtime_persisted_variables");
            }
            bpList = [meta];
            await storage.saveBlueprintList(bpList);
            await AsyncStorage.removeItem("app_blueprint");
          }
        }

        setBlueprintList(bpList);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, []);

  const reloadList = useCallback(async () => {
    const list = await storage.listBlueprints();
    setBlueprintList(list);
  }, []);

  const handleOpenBlueprint = useCallback((id: string) => {
    setRoute({ screen: "editor", blueprintId: id });
  }, []);

  const handleCreateBlueprint = useCallback(
    async (name: string) => {
      const id = uuid();
      const meta: BlueprintMeta = { id, name, createdAt: Date.now() };
      const newList = [...blueprintList, meta];
      setBlueprintList(newList);
      await storage.saveBlueprintList(newList);
      await storage.saveBlueprint(id, defaultBlueprint);
      setRoute({ screen: "editor", blueprintId: id });
    },
    [blueprintList]
  );

  const handleDeleteBlueprint = useCallback(
    async (id: string) => {
      await storage.deleteBlueprint(id);
      await reloadList();
      setRoute((prev) =>
        prev.screen === "editor" && prev.blueprintId === id
          ? { screen: "home" }
          : prev
      );
    },
    [reloadList]
  );

  const handleCloseBlueprint = useCallback(async () => {
    setRoute({ screen: "home" });
    await reloadList();
  }, [reloadList]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (route.screen === "editor") {
    return (
      <BlueprintEditor
        key={route.blueprintId}
        blueprintId={route.blueprintId}
        onCloseBlueprint={handleCloseBlueprint}
        onDeleteBlueprint={() => handleDeleteBlueprint(route.blueprintId)}
      />
    );
  }

  return (
    <HomeScreen
      blueprints={blueprintList}
      onOpenBlueprint={handleOpenBlueprint}
      onCreateBlueprint={handleCreateBlueprint}
      onDeleteBlueprint={handleDeleteBlueprint}
    />
  );
}
