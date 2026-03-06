import React, { useState, useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HomeScreen } from "./src/components/HomeScreen";
import { SlateEditor, defaultSlate } from "./src/components/SlateEditor";
import { AsyncStorageProvider } from "./src/storage";
import type { StorageProvider } from "./src/storage";
import type { SlateMeta } from "./src/types";
import { uuid } from "./src/utils/uuid";

const storage: StorageProvider = new AsyncStorageProvider();

type Route =
  | { screen: "home" }
  | { screen: "editor"; slateId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: "home" });
  const [slateList, setSlateList] = useState<SlateMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load slate list on startup with legacy migration
  useEffect(() => {
    (async () => {
      try {
        let bpList = await storage.listSlates();

        // Legacy migration: old single-slate key
        if (bpList.length === 0) {
          const legacySlate = await AsyncStorage.getItem("app_slate");
          if (legacySlate) {
            const migrationId = uuid();
            const meta: SlateMeta = {
              id: migrationId,
              name: "My Slate",
              createdAt: Date.now(),
            };
            await AsyncStorage.setItem(
              `project_slate_${migrationId}`,
              legacySlate
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
            await storage.saveSlateList(bpList);
            await AsyncStorage.removeItem("app_slate");
          }
        }

        setSlateList(bpList);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, []);

  const reloadList = useCallback(async () => {
    const list = await storage.listSlates();
    setSlateList(list);
  }, []);

  const handleOpenSlate = useCallback((id: string) => {
    setRoute({ screen: "editor", slateId: id });
  }, []);

  const handleCreateSlate = useCallback(
    async (name: string) => {
      const id = uuid();
      const meta: SlateMeta = { id, name, createdAt: Date.now() };
      const newList = [...slateList, meta];
      setSlateList(newList);
      await storage.saveSlateList(newList);
      await storage.saveSlate(id, defaultSlate);
      setRoute({ screen: "editor", slateId: id });
    },
    [slateList]
  );

  const handleDeleteSlate = useCallback(
    async (id: string) => {
      await storage.deleteSlate(id);
      await reloadList();
      setRoute((prev) =>
        prev.screen === "editor" && prev.slateId === id
          ? { screen: "home" }
          : prev
      );
    },
    [reloadList]
  );

  const handleCloseSlate = useCallback(async () => {
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
      <SlateEditor
        key={route.slateId}
        slateId={route.slateId}
        onCloseSlate={handleCloseSlate}
        onDeleteSlate={() => handleDeleteSlate(route.slateId)}
      />
    );
  }

  return (
    <HomeScreen
      slates={slateList}
      onOpenSlate={handleOpenSlate}
      onCreateSlate={handleCreateSlate}
      onDeleteSlate={handleDeleteSlate}
    />
  );
}
