import { StyleSheet } from "react-native";

export const sharedMenuStyles = StyleSheet.create({
  categoryHeader: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeader: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginVertical: 8,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#222",
    justifyContent: "center" as const,
    paddingHorizontal: 3,
  },
  toggleTrackOn: {
    backgroundColor: "#fff",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#555",
  },
  toggleThumbOn: {
    alignSelf: "flex-end" as const,
    backgroundColor: "#000",
  },
  editCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 10,
  },
  editInput: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelLabel: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  saveLabel: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700" as const,
  },
});
