import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HomeScreen } from "./src/components/HomeScreen";
import { SlateEditor, defaultSlate } from "./src/components/SlateEditor";
import { SupabaseStorageProvider } from "./src/storage";
import { useSupabaseSync } from "./src/hooks/useSupabaseSync";
import type { SlateMeta } from "./src/types";
import { uuid } from "./src/utils/uuid";

const storage = new SupabaseStorageProvider();

type Route =
  | { screen: "home" }
  | { screen: "editor"; slateId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: "home" });
  const [slateList, setSlateList] = useState<SlateMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { connectionStatus, isSyncing, syncAll } = useSupabaseSync(storage);

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

  const handleRenameSlate = useCallback(
    async (id: string, name: string) => {
      const newList = slateList.map((s) =>
        s.id === id ? { ...s, name } : s
      );
      setSlateList(newList);
      await storage.saveSlateList(newList);
    },
    [slateList]
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
        slateName={slateList.find((s) => s.id === route.slateId)?.name ?? "Slate"}
        onCloseSlate={handleCloseSlate}
        onDeleteSlate={() => handleDeleteSlate(route.slateId)}
        onRenameSlate={(name: string) => handleRenameSlate(route.slateId, name)}
        storage={storage}
      />
    );
  }

  return (
    <HomeScreen
      slates={slateList}
      onOpenSlate={handleOpenSlate}
      onCreateSlate={handleCreateSlate}
      onDeleteSlate={handleDeleteSlate}
      onRenameSlate={handleRenameSlate}
      connectionStatus={connectionStatus}
      isSyncing={isSyncing}
      onSync={syncAll}
      storage={storage}
    />
  );
}
