import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { BlueprintMeta } from "../types";

interface HomeScreenProps {
  blueprints: BlueprintMeta[];
  onOpenBlueprint: (id: string) => void;
  onCreateBlueprint: (name: string) => void;
  onDeleteBlueprint: (id: string) => void;
}

export function HomeScreen({
  blueprints,
  onOpenBlueprint,
  onCreateBlueprint,
  onDeleteBlueprint,
}: HomeScreenProps) {
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BlueprintMeta | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateBlueprint(trimmed);
    setNewName("");
    setNameModalVisible(false);
  };

  const confirmDelete = (bp: BlueprintMeta) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${bp.name}"?\n\nThis cannot be undone.`)) {
        onDeleteBlueprint(bp.id);
      }
    } else {
      setDeleteTarget(bp);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const sorted = [...blueprints].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>My Blueprints</Text>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="layers" size={48} color="#4b5563" />
          <Text style={styles.emptyTitle}>Create Your First Blueprint</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to start building
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sorted.map((bp) => (
            <Pressable
              key={bp.id}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onOpenBlueprint(bp.id)}
              onLongPress={() => confirmDelete(bp)}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Feather name="box" size={20} color="#818cf8" />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    # {bp.name}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDate(bp.createdAt)}
                  </Text>
                </View>
                <Pressable
                  style={styles.cardDeleteBtn}
                  onPress={() => confirmDelete(bp)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={16} color="#6b7280" />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            styles.createBtn,
            pressed && styles.createBtnPressed,
          ]}
          onPress={() => {
            setNewName("my blueprint");
            setNameModalVisible(true);
          }}
        >
          <Feather name="plus" size={20} color="#ffffff" />
          <Text style={styles.createBtnLabel}>New Blueprint</Text>
        </Pressable>
      </View>

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
            <Text style={styles.modalTitle}>New Blueprint</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Blueprint name"
              placeholderTextColor="#6b7280"
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
              <Text style={styles.modalTitle}>Delete Blueprint</Text>
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
                    onDeleteBlueprint(deleteTarget.id);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 100,
  },
  emptyTitle: {
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
  cardDate: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  cardDeleteBtn: {
    padding: 8,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 24,
  },
  createBtn: {
    flexDirection: "row",
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createBtnPressed: {
    backgroundColor: "#4f46e5",
  },
  createBtnLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalMessage: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 16,
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
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  modalCancelLabel: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "600",
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#6366f1",
    alignItems: "center",
  },
  modalCreateBtnDisabled: {
    opacity: 0.4,
  },
  modalCreateLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  modalDeleteLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
