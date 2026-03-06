import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SlateMeta } from "../types";
import type { SyncableStorageProvider } from "../storage/StorageProvider";
import { SyncStatusBadge } from "./SyncStatusBadge";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HomeScreenProps {
  slates: SlateMeta[];
  onOpenSlate: (id: string) => void;
  onCreateSlate: (name: string) => void;
  onDeleteSlate: (id: string) => void;
  onRenameSlate: (id: string, name: string) => void;
  connectionStatus?: 'online' | 'offline' | 'syncing';
  isSyncing?: boolean;
  onSync?: () => void;
  storage?: SyncableStorageProvider;
}

export function HomeScreen({
  slates,
  onOpenSlate,
  onCreateSlate,
  onDeleteSlate,
  onRenameSlate,
  connectionStatus,
  isSyncing,
  onSync,
  storage,
}: HomeScreenProps) {
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SlateMeta | null>(null);
  const [renameTarget, setRenameTarget] = useState<SlateMeta | null>(null);
  const [renameText, setRenameText] = useState("");

  const handleCreate = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateSlate(trimmed);
    setNewName("");
    setNameModalVisible(false);
  }, [newName, onCreateSlate]);

  const confirmDelete = useCallback((bp: SlateMeta) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${bp.name}"?\n\nThis cannot be undone.`)) {
        onDeleteSlate(bp.id);
      }
    } else {
      setDeleteTarget(bp);
    }
  }, [onDeleteSlate]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const sorted = useMemo(() => [...slates].sort((a, b) => b.createdAt - a.createdAt), [slates]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>UNTITLED IDE</Text>
            {connectionStatus && (
              <Pressable style={styles.syncIndicator} onPress={onSync} disabled={isSyncing}>
                <Feather
                  name={connectionStatus === 'online' ? 'wifi' : connectionStatus === 'syncing' ? 'refresh-cw' : 'wifi-off'}
                  size={12}
                  color={connectionStatus === 'online' ? '#22c55e' : connectionStatus === 'syncing' ? '#f59e0b' : '#555'}
                />
                <Text style={[styles.syncText, { color: connectionStatus === 'online' ? '#22c55e' : connectionStatus === 'syncing' ? '#f59e0b' : '#555' }]}>
                  {connectionStatus === 'syncing' ? 'Syncing...' : connectionStatus}
                </Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.heroTitle}>
            Your{"\n"}Slates
          </Text>
          <Text style={styles.heroSub}>
            Design, prototype, and build interfaces visually.
          </Text>
        </View>

        {/* New Slate Button */}
        <Pressable
          style={({ pressed }) => [
            styles.createBtn,
            pressed && styles.createBtnPressed,
          ]}
          onPress={() => {
            setNewName("my slate");
            setNameModalVisible(true);
          }}
        >
          <View style={styles.createBtnIcon}>
            <Feather name="plus" size={18} color="#000" />
          </View>
          <View>
            <Text style={styles.createBtnLabel}>New Slate</Text>
            <Text style={styles.createBtnHint}>Start from scratch</Text>
          </View>
        </Pressable>

        {/* Slate List */}
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyDiamond}>
              <Feather name="layers" size={28} color="#333" />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>
              Create your first slate to get started
            </Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel}>RECENT</Text>
            <View style={styles.listGrid}>
              {sorted.map((bp, i) => (
                <Pressable
                  key={bp.id}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => onOpenSlate(bp.id)}
                  onLongPress={() => confirmDelete(bp)}
                >
                  <View style={styles.cardPreview}>
                    <View style={styles.cardPreviewLines}>
                      <View style={[styles.previewLine, { width: "60%" }]} />
                      <View style={[styles.previewLine, { width: "80%" }]} />
                      <View style={[styles.previewLine, { width: "45%" }]} />
                      <View style={[styles.previewLine, { width: "70%" }]} />
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardNameRow}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {bp.name}
                      </Text>
                      <SyncStatusBadge syncStatus={bp.syncStatus} size={12} />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardDate}>
                        {formatDate(bp.createdAt)}
                      </Text>
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => { setRenameTarget(bp); setRenameText(bp.name); }}
                          hitSlop={8}
                          style={styles.cardActionBtn}
                        >
                          <Feather name="edit-2" size={13} color="#444" />
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDelete(bp)}
                          hitSlop={8}
                          style={styles.cardActionBtn}
                        >
                          <Feather name="trash-2" size={13} color="#444" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Name prompt modal */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNameModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>New Slate</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Slate name"
              placeholderTextColor="#555"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={styles.modalCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalCreateBtn,
                  !newName.trim() && styles.modalCreateBtnDisabled,
                ]}
                onPress={handleCreate}
                disabled={!newName.trim()}
              >
                <Text style={styles.modalCreateLabel}>Create</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Delete confirmation modal (native) */}
      {deleteTarget && Platform.OS !== "web" && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDeleteTarget(null)}
          >
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Delete Slate</Text>
              <Text style={styles.modalMessage}>
                Delete "{deleteTarget.name}"? This cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setDeleteTarget(null)}
                >
                  <Text style={styles.modalCancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalDeleteBtn}
                  onPress={() => {
                    onDeleteSlate(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                >
                  <Text style={styles.modalDeleteLabel}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Rename modal */}
      {renameTarget && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setRenameTarget(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setRenameTarget(null)}
          >
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Rename Slate</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Slate name"
                placeholderTextColor="#555"
                value={renameText}
                onChangeText={setRenameText}
                autoFocus
                onSubmitEditing={() => {
                  const trimmed = renameText.trim();
                  if (trimmed) {
                    onRenameSlate(renameTarget.id, trimmed);
                  }
                  setRenameTarget(null);
                }}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setRenameTarget(null)}
                >
                  <Text style={styles.modalCancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalCreateBtn,
                    !renameText.trim() && styles.modalCreateBtnDisabled,
                  ]}
                  onPress={() => {
                    const trimmed = renameText.trim();
                    if (trimmed) {
                      onRenameSlate(renameTarget.id, trimmed);
                    }
                    setRenameTarget(null);
                  }}
                  disabled={!renameText.trim()}
                >
                  <Text style={styles.modalCreateLabel}>Rename</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroLabel: {
    color: "#555",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#0a0a0a",
  },
  syncText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "200",
    lineHeight: 48,
    letterSpacing: -1,
  },
  heroSub: {
    color: "#666",
    fontSize: 15,
    fontWeight: "400",
    marginTop: 12,
    letterSpacing: 0.2,
  },

  // Create Button
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 14,
  },
  createBtnPressed: {
    backgroundColor: "#1a1a1a",
  },
  createBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  createBtnHint: {
    color: "#555",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 1,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyDiamond: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#444",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  emptySub: {
    color: "#333",
    fontSize: 13,
    fontWeight: "400",
  },

  // List Section
  listSection: {
    paddingHorizontal: 24,
  },
  sectionLabel: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },

  // Cards
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#0a0a0a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
  },
  cardPressed: {
    backgroundColor: "#111",
    borderColor: "#333",
  },
  cardPreview: {
    height: 80,
    backgroundColor: "#080808",
    padding: 14,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#141414",
  },
  cardPreviewLines: {
    gap: 6,
  },
  previewLine: {
    height: 3,
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
  },
  cardBody: {
    padding: 14,
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardName: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardDate: {
    color: "#333",
    fontSize: 11,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardActionBtn: {
    padding: 4,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#222",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  modalMessage: {
    color: "#777",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    fontWeight: "400",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
  },
  modalCancelLabel: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  modalCreateBtnDisabled: {
    opacity: 0.3,
  },
  modalCreateLabel: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
  modalDeleteLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
