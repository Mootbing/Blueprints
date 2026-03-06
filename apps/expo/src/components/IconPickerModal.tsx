import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import { ColorPickerModal } from "./ColorPickerModal";

const LIBRARIES = [
  { key: "feather" as const, label: "Feather", Component: Feather },
  { key: "material" as const, label: "Material", Component: MaterialIcons },
  { key: "ionicons" as const, label: "Ionicons", Component: Ionicons },
];

type LibraryKey = "feather" | "material" | "ionicons";

function getIconNames(library: LibraryKey): string[] {
  switch (library) {
    case "feather":
      return Object.keys(Feather.glyphMap).sort();
    case "material":
      return Object.keys(MaterialIcons.glyphMap).sort();
    case "ionicons":
      return Object.keys(Ionicons.glyphMap).sort();
  }
}

const ICON_NAMES_CACHE: Partial<Record<LibraryKey, string[]>> = {};
function getCachedIconNames(library: LibraryKey): string[] {
  if (!ICON_NAMES_CACHE[library]) {
    ICON_NAMES_CACHE[library] = getIconNames(library);
  }
  return ICON_NAMES_CACHE[library]!;
}

const SIZES = [16, 20, 24, 28, 32, 40, 48];

interface IconPickerModalProps {
  visible: boolean;
  currentName: string;
  currentLibrary: LibraryKey;
  currentSize: number;
  currentColor: string;
  onSelect: (updates: { name?: string; library?: LibraryKey; size?: number; color?: string }) => void;
  onClose: () => void;
}

export function IconPickerModal({
  visible,
  currentName,
  currentLibrary,
  currentSize,
  currentColor,
  onSelect,
  onClose,
}: IconPickerModalProps) {
  const [library, setLibrary] = useState<LibraryKey>(currentLibrary);
  const [selectedName, setSelectedName] = useState(currentName);
  const [size, setSize] = useState(currentSize);
  const [color, setColor] = useState(currentColor);
  const [search, setSearch] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setLibrary(currentLibrary);
      setSelectedName(currentName);
      setSize(currentSize);
      setColor(currentColor);
      setSearch("");
    }
  }, [visible, currentLibrary, currentName, currentSize, currentColor]);

  const allNames = useMemo(() => getCachedIconNames(library), [library]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allNames;
    const q = search.trim().toLowerCase();
    return allNames.filter((n) => n.toLowerCase().includes(q));
  }, [allNames, search]);

  const IconComp = LIBRARIES.find((l) => l.key === library)!.Component;

  const handleDone = useCallback(() => {
    onSelect({ name: selectedName, library, size, color });
    onClose();
  }, [selectedName, library, size, color, onSelect, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderIcon = useCallback(
    ({ item }: { item: string }) => {
      const isSelected = item === selectedName;
      return (
        <Pressable
          style={[styles.iconCell, isSelected && styles.iconCellSelected]}
          onPress={() => setSelectedName(item)}
        >
          <IconComp name={item as any} size={22} color={isSelected ? "#fff" : "#888"} />
        </Pressable>
      );
    },
    [selectedName, IconComp],
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} hitSlop={12}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Choose Icon</Text>
            <Pressable onPress={handleDone} hitSlop={12}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          {/* Preview */}
          <View style={styles.previewRow}>
            <View style={styles.previewBox}>
              <IconComp name={selectedName as any} size={size} color={color} />
            </View>
            <Text style={styles.previewName}>{selectedName}</Text>
          </View>

          {/* Library tabs */}
          <View style={styles.tabRow}>
            {LIBRARIES.map((lib) => (
              <Pressable
                key={lib.key}
                style={[styles.tab, library === lib.key && styles.tabActive]}
                onPress={() => setLibrary(lib.key)}
              >
                <Text style={[styles.tabText, library === lib.key && styles.tabTextActive]}>
                  {lib.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Feather name="search" size={14} color="#555" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search icons..."
              placeholderTextColor="#333"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x" size={14} color="#555" />
              </Pressable>
            )}
          </View>

          {/* Icon grid */}
          <FlatList
            data={filtered}
            renderItem={renderIcon}
            keyExtractor={keyExtractor}
            numColumns={6}
            columnWrapperStyle={styles.gridRow}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={60}
            maxToRenderPerBatch={60}
            windowSize={5}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No icons found</Text>
            }
          />

          {/* Size picker */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Size</Text>
            <View style={styles.sizeRow}>
              {SIZES.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.sizeBtn, size === s && styles.sizeBtnActive]}
                  onPress={() => setSize(s)}
                >
                  <Text style={[styles.sizeBtnText, size === s && styles.sizeBtnTextActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Color picker */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Color</Text>
            <Pressable
              style={styles.colorBtn}
              onPress={() => setColorPickerOpen(true)}
            >
              <View style={[styles.colorSwatch, { backgroundColor: color }]} />
              <Text style={styles.colorHex}>{color}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ColorPickerModal
        visible={colorPickerOpen}
        initialColor={color}
        onSelect={(c) => setColor(c)}
        onClose={() => setColorPickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cancelText: { color: "#555", fontSize: 16 },
  title: { color: "#fff", fontSize: 17, fontWeight: "300", letterSpacing: 0.5 },
  doneText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  previewRow: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  previewBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  previewName: {
    color: "#888",
    fontSize: 12,
    fontFamily: "monospace",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#000",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ccc",
    fontSize: 14,
  },
  grid: {
    flex: 1,
    minHeight: 200,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  gridRow: {
    justifyContent: "flex-start",
    gap: 4,
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  iconCellSelected: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#444",
  },
  emptyText: {
    color: "#444",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 40,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  controlLabel: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
    width: 40,
  },
  sizeRow: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  sizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#111",
  },
  sizeBtnActive: {
    backgroundColor: "#fff",
  },
  sizeBtnText: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
  },
  sizeBtnTextActive: {
    color: "#000",
  },
  colorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333",
  },
  colorHex: {
    color: "#888",
    fontSize: 12,
    fontFamily: "monospace",
  },
});
