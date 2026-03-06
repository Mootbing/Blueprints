import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Share,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SyncableStorageProvider } from "../storage/StorageProvider";
import type { ShareInfo } from "../types";

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  storage: SyncableStorageProvider;
  slateId: string;
}

export function ShareModal({ visible, onClose, storage, slateId }: ShareModalProps) {
  const [links, setLinks] = useState<ShareInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await storage.listShareLinks(slateId);
      setLinks(result);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [storage, slateId]);

  useEffect(() => {
    if (visible) {
      loadLinks();
    }
  }, [visible, loadLinks]);

  const handleCreate = async (role: 'viewer' | 'editor') => {
    setCreating(true);
    try {
      const info = await storage.createShareLink(slateId, role);
      setLinks((prev) => [info, ...prev]);
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const handleRevoke = async (code: string) => {
    try {
      await storage.revokeShareLink(code);
      setLinks((prev) =>
        prev.map((l) => (l.shareCode === code ? { ...l, isActive: false } : l))
      );
    } catch {
      // ignore
    }
  };

  const handleCopy = async (code: string) => {
    try {
      if (Platform.OS === "web" && navigator?.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        await Share.share({ message: code });
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Share Slate</Text>

          {/* Create buttons */}
          <View style={styles.createRow}>
            <Pressable
              style={[styles.createBtn, creating && styles.createBtnDisabled]}
              onPress={() => handleCreate("viewer")}
              disabled={creating}
            >
              <Feather name="eye" size={14} color="#ccc" />
              <Text style={styles.createBtnText}>Viewer Link</Text>
            </Pressable>
            <Pressable
              style={[styles.createBtn, creating && styles.createBtnDisabled]}
              onPress={() => handleCreate("editor")}
              disabled={creating}
            >
              <Feather name="edit" size={14} color="#ccc" />
              <Text style={styles.createBtnText}>Editor Link</Text>
            </Pressable>
          </View>

          {/* Links list */}
          {loading ? (
            <ActivityIndicator color="#666" style={{ marginVertical: 20 }} />
          ) : links.length === 0 ? (
            <Text style={styles.emptyText}>No share links yet</Text>
          ) : (
            <View style={styles.linkList}>
              {links.map((link) => (
                <View
                  key={link.shareCode}
                  style={[styles.linkRow, !link.isActive && styles.linkRowInactive]}
                >
                  <View style={styles.linkInfo}>
                    <Text style={[styles.linkCode, !link.isActive && styles.linkCodeInactive]}>
                      {link.shareCode}
                    </Text>
                    <Text style={styles.linkRole}>
                      {link.role} {!link.isActive ? "(revoked)" : ""}
                    </Text>
                  </View>
                  <View style={styles.linkActions}>
                    {link.isActive && (
                      <>
                        <Pressable
                          style={styles.linkActionBtn}
                          onPress={() => handleCopy(link.shareCode)}
                        >
                          <Feather
                            name={copiedCode === link.shareCode ? "check" : "copy"}
                            size={14}
                            color={copiedCode === link.shareCode ? "#22c55e" : "#888"}
                          />
                        </Pressable>
                        <Pressable
                          style={styles.linkActionBtn}
                          onPress={() => handleRevoke(link.shareCode)}
                        >
                          <Feather name="x" size={14} color="#dc2626" />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Close */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#222",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  createRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  createBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 12,
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    color: "#444",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 20,
  },
  linkList: {
    gap: 8,
    marginBottom: 20,
    maxHeight: 200,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkRowInactive: {
    opacity: 0.4,
  },
  linkInfo: {
    flex: 1,
    gap: 2,
  },
  linkCode: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  linkCodeInactive: {
    color: "#555",
  },
  linkRole: {
    color: "#555",
    fontSize: 11,
    fontWeight: "500",
  },
  linkActions: {
    flexDirection: "row",
    gap: 8,
  },
  linkActionBtn: {
    padding: 6,
  },
  closeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },
});
