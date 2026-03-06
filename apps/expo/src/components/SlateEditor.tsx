import React, { useState, useCallback, useEffect, useRef } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Canvas } from "./Canvas";
import type { StorageProvider } from "../storage";
import type { SyncableStorageProvider } from "../storage/StorageProvider";
import type { AppSlate, Layout, Component, ComponentStyleUpdates, Screen, Variable } from "../types";
import { useCollaboration } from "../hooks/useCollaboration";
import { useRuntimeStore } from "../runtime";
import { uuid } from "../utils/uuid";
import { deepUpdateComponent, deepDeleteComponent } from "../utils/componentTree";
import { useUndoHistory } from "../hooks/useUndoHistory";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";
const PLAYGROUND_SCREEN_ID = "00000000-0000-0000-0000-000000000002";

export const BACKGROUND_ID = "00000000-0000-0000-0000-00000000000b";

export function makeBackgroundShape(color = "#000000"): Component {
  return {
    type: "shape" as const,
    id: BACKGROUND_ID,
    layout: { x: 0, y: 0, width: 1, height: 1 },
    shapeType: "rectangle" as const,
    backgroundColor: color,
    opacity: 1,
  };
}

function bg(id: string, color = "#000000"): Component {
  return { type: "shape", id, layout: { x: 0, y: 0, width: 1, height: 1 }, shapeType: "rectangle", backgroundColor: color, opacity: 1 };
}

export const defaultSlate: AppSlate = {
  version: 1,
  initial_screen_id: SCREEN_ID,
  variables: [
    { name: "name", defaultValue: "" },
  ],
  theme: {
    primaryColor: "#8B5CF6",
    colors: {
      primary: "#8B5CF6",
      secondary: "#6366F1",
      error: "#EF4444",
      success: "#22C55E",
      warning: "#F97316",
    },
  },
  screens: {
    // ── Page 1: Home ──
    [SCREEN_ID]: {
      id: SCREEN_ID,
      name: "Home",
      components: [
        bg(BACKGROUND_ID),

        // Gradient accent strip
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000001001",
          layout: { x: 0, y: 0, width: 1, height: 0.006 },
          shapeType: "rectangle",
          gradientEnabled: true,
          gradientColors: ["#6366F1", "#8B5CF6", "#EC4899"],
          gradientDirection: "to-right",
          opacity: 1,
        },

        // Icon
        {
          type: "icon",
          id: "00000000-0000-0000-0000-000000001002",
          layout: { x: 0.06, y: 0.03, width: 0.08, height: 0.035 },
          name: "layers",
          library: "feather",
          size: 26,
          color: "#8B5CF6",
        },

        // Title
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001003",
          layout: { x: 0.06, y: 0.07, width: 0.88, height: 0.055 },
          content: "Slate",
          fontSize: 44,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "left",
        },

        // Tagline
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001004",
          layout: { x: 0.06, y: 0.13, width: 0.88, height: 0.05 },
          content: "Design screens, wire logic, and ship apps \u2014 all from your phone.",
          fontSize: 14,
          color: "#666",
          fontWeight: "normal",
          textAlign: "left",
        },

        // Divider
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000001005",
          layout: { x: 0.06, y: 0.19, width: 0.88, height: 0.001 },
          color: "#1a1a1a",
          thickness: 1,
          direction: "horizontal",
        },

        // ── Interactive Greeting Card ──

        // Card background
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000001010",
          layout: { x: 0.04, y: 0.21, width: 0.92, height: 0.19 },
          shapeType: "rounded-rectangle",
          backgroundColor: "#0d0d14",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#1a1a2e",
          shadowEnabled: true,
          shadowColor: "#8B5CF6",
          shadowOpacity: 0.15,
          shadowRadius: 20,
          opacity: 1,
        },

        // Card label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001011",
          layout: { x: 0.08, y: 0.225, width: 0.84, height: 0.025 },
          content: "Live demo \u2014 type your name",
          fontSize: 12,
          color: "#8B5CF6",
          fontWeight: "600",
          textAlign: "left",
        },

        // Text input
        {
          type: "textInput",
          id: "00000000-0000-0000-0000-000000001012",
          layout: { x: 0.08, y: 0.26, width: 0.84, height: 0.05 },
          placeholder: "Your name...",
          fontSize: 16,
          color: "#ffffff",
          placeholderColor: "#444",
          backgroundColor: "#111",
          borderColor: "#2a2a3e",
          borderWidth: 1,
          borderRadius: 10,
          boundVariable: "name",
        },

        // "Hello," label (visible when name entered)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001013",
          layout: { x: 0.08, y: 0.325, width: 0.15, height: 0.035 },
          content: "Hello,",
          fontSize: 22,
          color: "#888",
          fontWeight: "300",
          textAlign: "left",
          visibleWhen: "name",
        },

        // Dynamic name display
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001014",
          layout: { x: 0.23, y: 0.325, width: 0.65, height: 0.035 },
          content: "",
          fontSize: 22,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "left",
          bindings: { content: "name" },
          visibleWhen: "name",
        },

        // Placeholder hint (visible when no name)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001015",
          layout: { x: 0.08, y: 0.33, width: 0.84, height: 0.03 },
          content: "\u2191 Your name appears here in real-time",
          fontSize: 12,
          color: "#333",
          fontWeight: "normal",
          textAlign: "center",
          visibleWhen: "!name",
        },

        // ── Features Section ──

        // Section header
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001020",
          layout: { x: 0.06, y: 0.43, width: 0.88, height: 0.03 },
          content: "What\u2019s Inside",
          fontSize: 20,
          color: "#ccc",
          fontWeight: "300",
          textAlign: "left",
        },

        // Feature 1: Icon
        {
          type: "icon",
          id: "00000000-0000-0000-0000-000000001031",
          layout: { x: 0.06, y: 0.475, width: 0.06, height: 0.03 },
          name: "move",
          library: "feather",
          size: 18,
          color: "#6366F1",
        },
        // Feature 1: Text
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001032",
          layout: { x: 0.14, y: 0.475, width: 0.8, height: 0.03 },
          content: "Drag & drop components with gesture controls",
          fontSize: 13,
          color: "#888",
          fontWeight: "normal",
          textAlign: "left",
        },

        // Feature 2: Icon
        {
          type: "icon",
          id: "00000000-0000-0000-0000-000000001033",
          layout: { x: 0.06, y: 0.515, width: 0.06, height: 0.03 },
          name: "git-branch",
          library: "feather",
          size: 18,
          color: "#8B5CF6",
        },
        // Feature 2: Text
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001034",
          layout: { x: 0.14, y: 0.515, width: 0.8, height: 0.03 },
          content: "Variables, expressions & computed bindings",
          fontSize: 13,
          color: "#888",
          fontWeight: "normal",
          textAlign: "left",
        },

        // Feature 3: Icon
        {
          type: "icon",
          id: "00000000-0000-0000-0000-000000001035",
          layout: { x: 0.06, y: 0.555, width: 0.06, height: 0.03 },
          name: "eye",
          library: "feather",
          size: 18,
          color: "#EC4899",
        },
        // Feature 3: Text
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001036",
          layout: { x: 0.14, y: 0.555, width: 0.8, height: 0.03 },
          content: "Conditional visibility, actions & multi-screen nav",
          fontSize: 13,
          color: "#888",
          fontWeight: "normal",
          textAlign: "left",
        },

        // ── CTA Button ──
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000001040",
          layout: { x: 0.06, y: 0.62, width: 0.88, height: 0.065 },
          label: "Open Playground \u2192",
          backgroundColor: "#6366F1",
          textColor: "#ffffff",
          fontSize: 17,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 14,
          gradientEnabled: true,
          gradientColors: ["#6366F1", "#8B5CF6"],
          gradientDirection: "to-right",
          shadowEnabled: true,
          shadowColor: "#6366F1",
          shadowOpacity: 0.3,
          shadowRadius: 12,
          actions: { onTap: [{ type: "NAVIGATE", target: PLAYGROUND_SCREEN_ID }] },
        },

        // Blankify button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000001041",
          layout: { x: 0.06, y: 0.71, width: 0.88, height: 0.055 },
          label: "Blankify Project",
          backgroundColor: "#111",
          textColor: "#666",
          fontSize: 14,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "RESET_CANVAS" }] },
        },

        // ── How To Use ──

        // Divider
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000001050",
          layout: { x: 0.06, y: 0.79, width: 0.88, height: 0.001 },
          color: "#1a1a1a",
          thickness: 1,
          direction: "horizontal",
        },

        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001051",
          layout: { x: 0.06, y: 0.81, width: 0.88, height: 0.025 },
          content: "1. Tap <> to view components & layer tree",
          fontSize: 12,
          color: "#444",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001052",
          layout: { x: 0.06, y: 0.84, width: 0.88, height: 0.025 },
          content: "2. Add components, drag & style them, or use AI",
          fontSize: 12,
          color: "#444",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001053",
          layout: { x: 0.06, y: 0.87, width: 0.88, height: 0.025 },
          content: "3. Toggle the icon to switch dev/preview modes",
          fontSize: 12,
          color: "#444",
          fontWeight: "normal",
          textAlign: "left",
        },

        // Footer
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000001060",
          layout: { x: 0.06, y: 0.93, width: 0.88, height: 0.02 },
          content: "v2.0  \u2022  Made with Slate",
          fontSize: 11,
          color: "#333",
          fontWeight: "normal",
          textAlign: "left",
        },
      ],
    },

    // ── Page 2: Playground ──
    [PLAYGROUND_SCREEN_ID]: {
      id: PLAYGROUND_SCREEN_ID,
      name: "Playground",
      variables: [
        { name: "score", defaultValue: 0 },
        { name: "celsius", defaultValue: 25 },
        { name: "fahrenheit", defaultValue: 77 },
        { name: "showTemp", defaultValue: false },
      ],
      components: [
        bg(BACKGROUND_ID),

        // Gradient accent strip
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000002001",
          layout: { x: 0, y: 0, width: 1, height: 0.006 },
          shapeType: "rectangle",
          gradientEnabled: true,
          gradientColors: ["#6366F1", "#8B5CF6", "#EC4899"],
          gradientDirection: "to-right",
          opacity: 1,
        },

        // Back button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002002",
          layout: { x: 0.04, y: 0.025, width: 0.18, height: 0.04 },
          label: "\u2190 Back",
          backgroundColor: "#111",
          textColor: "#888",
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 10,
          actions: { onTap: [{ type: "NAVIGATE", target: SCREEN_ID }] },
        },

        // Title
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002003",
          layout: { x: 0.06, y: 0.025, width: 0.88, height: 0.04 },
          content: "Playground",
          fontSize: 20,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
        },

        // ── Score Tracker ──

        // Section label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002010",
          layout: { x: 0.06, y: 0.085, width: 0.5, height: 0.025 },
          content: "Score Tracker",
          fontSize: 14,
          color: "#8B5CF6",
          fontWeight: "600",
          textAlign: "left",
        },

        // Card background
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000002011",
          layout: { x: 0.04, y: 0.115, width: 0.92, height: 0.30 },
          shapeType: "rounded-rectangle",
          backgroundColor: "#0d0d14",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#1a1a2e",
          opacity: 1,
        },

        // Score display
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002012",
          layout: { x: 0.1, y: 0.13, width: 0.8, height: 0.09 },
          content: "0",
          fontSize: 64,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "score" },
        },

        // "points" label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002013",
          layout: { x: 0.1, y: 0.225, width: 0.8, height: 0.02 },
          content: "points",
          fontSize: 13,
          color: "#444",
          fontWeight: "normal",
          textAlign: "center",
        },

        // -5 button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002020",
          layout: { x: 0.08, y: 0.26, width: 0.19, height: 0.05 },
          label: "-5",
          backgroundColor: "#1a1a2e",
          textColor: "#EC4899",
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 10,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "score", value: "score - 5" }] },
        },

        // -1 button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002021",
          layout: { x: 0.29, y: 0.26, width: 0.19, height: 0.05 },
          label: "-1",
          backgroundColor: "#1a1a2e",
          textColor: "#f97316",
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 10,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "score", value: "score - 1" }] },
        },

        // +1 button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002022",
          layout: { x: 0.50, y: 0.26, width: 0.19, height: 0.05 },
          label: "+1",
          backgroundColor: "#1a1a2e",
          textColor: "#22c55e",
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 10,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "score", value: "score + 1" }] },
        },

        // +5 button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002023",
          layout: { x: 0.71, y: 0.26, width: 0.19, height: 0.05 },
          label: "+5",
          backgroundColor: "#1a1a2e",
          textColor: "#3b82f6",
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 10,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "score", value: "score + 5" }] },
        },

        // Reset button with CONDITIONAL action
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002024",
          layout: { x: 0.08, y: 0.32, width: 0.84, height: 0.045 },
          label: "Reset (halves if > 10, else zeroes)",
          backgroundColor: "#111",
          textColor: "#555",
          fontSize: 12,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 10,
          actions: {
            onTap: [{
              type: "CONDITIONAL",
              condition: "score > 10",
              then: [{ type: "SET_VARIABLE", key: "score", value: "floor(score / 2)" }],
              else: [{ type: "SET_VARIABLE", key: "score", value: "0" }],
            }],
          },
        },

        // Status: On fire! (score >= 50)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002030",
          layout: { x: 0.1, y: 0.38, width: 0.8, height: 0.025 },
          content: "On fire!",
          fontSize: 16,
          color: "#f97316",
          fontWeight: "bold",
          textAlign: "center",
          visibleWhen: "score >= 50",
        },

        // Status: Nice (score 10-49)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002031",
          layout: { x: 0.1, y: 0.38, width: 0.8, height: 0.025 },
          content: "Nice, keep going!",
          fontSize: 14,
          color: "#8B5CF6",
          fontWeight: "600",
          textAlign: "center",
          visibleWhen: "score >= 10 && score < 50",
        },

        // Status: Getting started (score 0-9)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002032",
          layout: { x: 0.1, y: 0.38, width: 0.8, height: 0.025 },
          content: "Tap + to get started",
          fontSize: 13,
          color: "#444",
          fontWeight: "normal",
          textAlign: "center",
          visibleWhen: "score >= 0 && score < 10",
        },

        // Status: Negative (score < 0)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002033",
          layout: { x: 0.1, y: 0.38, width: 0.8, height: 0.025 },
          content: "In the negatives!",
          fontSize: 14,
          color: "#EC4899",
          fontWeight: "600",
          textAlign: "center",
          visibleWhen: "score < 0",
        },

        // ── Divider ──
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000002040",
          layout: { x: 0.06, y: 0.43, width: 0.88, height: 0.001 },
          color: "#1a1a1a",
          thickness: 1,
          direction: "horizontal",
        },

        // ── Temperature Converter ──

        // Section label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002050",
          layout: { x: 0.06, y: 0.445, width: 0.6, height: 0.025 },
          content: "Temperature Converter",
          fontSize: 14,
          color: "#8B5CF6",
          fontWeight: "600",
          textAlign: "left",
        },

        // Toggle
        {
          type: "toggle",
          id: "00000000-0000-0000-0000-000000002051",
          layout: { x: 0.78, y: 0.443, width: 0.16, height: 0.03 },
          activeColor: "#8B5CF6",
          inactiveColor: "#333",
          thumbColor: "#ffffff",
          actions: { onChange: [{ type: "TOGGLE_VARIABLE", key: "showTemp" }] },
        },

        // Hint when hidden
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002065",
          layout: { x: 0.06, y: 0.49, width: 0.88, height: 0.025 },
          content: "\u2191 Toggle to reveal a live \u00b0C \u2192 \u00b0F converter",
          fontSize: 12,
          color: "#333",
          fontWeight: "normal",
          textAlign: "center",
          visibleWhen: "!showTemp",
        },

        // Converter card background
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000002052",
          layout: { x: 0.04, y: 0.48, width: 0.92, height: 0.20 },
          shapeType: "rounded-rectangle",
          backgroundColor: "#0d0d14",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#1a1a2e",
          opacity: 1,
          visibleWhen: "showTemp",
        },

        // \u00b0C label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002053",
          layout: { x: 0.08, y: 0.495, width: 0.08, height: 0.03 },
          content: "\u00b0C",
          fontSize: 16,
          color: "#3b82f6",
          fontWeight: "bold",
          textAlign: "center",
          visibleWhen: "showTemp",
        },

        // Celsius input
        {
          type: "textInput",
          id: "00000000-0000-0000-0000-000000002054",
          layout: { x: 0.18, y: 0.49, width: 0.72, height: 0.04 },
          placeholder: "Enter \u00b0C...",
          defaultValue: "25",
          fontSize: 16,
          color: "#ffffff",
          placeholderColor: "#444",
          backgroundColor: "#111",
          borderColor: "#2a2a3e",
          borderWidth: 1,
          borderRadius: 10,
          keyboardType: "numeric",
          boundVariable: "celsius",
          visibleWhen: "showTemp",
          actions: {
            onChange: [{ type: "SET_VARIABLE", key: "fahrenheit", value: "celsius * 9 / 5 + 32" }],
          },
        },

        // Arrow
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002055",
          layout: { x: 0.06, y: 0.54, width: 0.88, height: 0.02 },
          content: "\u2193",
          fontSize: 16,
          color: "#444",
          fontWeight: "normal",
          textAlign: "center",
          visibleWhen: "showTemp",
        },

        // \u00b0F label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002056",
          layout: { x: 0.08, y: 0.57, width: 0.08, height: 0.03 },
          content: "\u00b0F",
          fontSize: 16,
          color: "#f97316",
          fontWeight: "bold",
          textAlign: "center",
          visibleWhen: "showTemp",
        },

        // Fahrenheit result
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002057",
          layout: { x: 0.18, y: 0.565, width: 0.72, height: 0.04 },
          content: "77",
          fontSize: 28,
          color: "#f97316",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "fahrenheit" },
          visibleWhen: "showTemp",
        },

        // Quick temp: 0\u00b0C
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002060",
          layout: { x: 0.08, y: 0.62, width: 0.26, height: 0.04 },
          label: "0\u00b0C",
          backgroundColor: "#1a1a2e",
          textColor: "#3b82f6",
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 10,
          visibleWhen: "showTemp",
          actions: {
            onTap: [
              { type: "SET_VARIABLE", key: "celsius", value: "0" },
              { type: "SET_VARIABLE", key: "fahrenheit", value: "32" },
            ],
          },
        },

        // Quick temp: 37\u00b0C
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002061",
          layout: { x: 0.37, y: 0.62, width: 0.26, height: 0.04 },
          label: "37\u00b0C",
          backgroundColor: "#1a1a2e",
          textColor: "#22c55e",
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 10,
          visibleWhen: "showTemp",
          actions: {
            onTap: [
              { type: "SET_VARIABLE", key: "celsius", value: "37" },
              { type: "SET_VARIABLE", key: "fahrenheit", value: "98.6" },
            ],
          },
        },

        // Quick temp: 100\u00b0C
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000002062",
          layout: { x: 0.66, y: 0.62, width: 0.26, height: 0.04 },
          label: "100\u00b0C",
          backgroundColor: "#1a1a2e",
          textColor: "#f97316",
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 10,
          visibleWhen: "showTemp",
          actions: {
            onTap: [
              { type: "SET_VARIABLE", key: "celsius", value: "100" },
              { type: "SET_VARIABLE", key: "fahrenheit", value: "212" },
            ],
          },
        },

        // ── Divider ──
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000002070",
          layout: { x: 0.06, y: 0.70, width: 0.88, height: 0.001 },
          color: "#1a1a1a",
          thickness: 1,
          direction: "horizontal",
        },

        // ── Gradient Showcase ──

        // Section label
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002080",
          layout: { x: 0.06, y: 0.715, width: 0.5, height: 0.025 },
          content: "Gradient Shapes",
          fontSize: 14,
          color: "#8B5CF6",
          fontWeight: "600",
          textAlign: "left",
        },

        // Gradient 1: Purple-blue
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000002081",
          layout: { x: 0.06, y: 0.75, width: 0.27, height: 0.07 },
          shapeType: "rounded-rectangle",
          borderRadius: 12,
          gradientEnabled: true,
          gradientColors: ["#6366F1", "#8B5CF6"],
          gradientDirection: "to-right",
          opacity: 1,
          shadowEnabled: true,
          shadowColor: "#6366F1",
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },

        // Gradient 2: Pink-orange
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000002082",
          layout: { x: 0.36, y: 0.75, width: 0.27, height: 0.07 },
          shapeType: "rounded-rectangle",
          borderRadius: 12,
          gradientEnabled: true,
          gradientColors: ["#EC4899", "#f97316"],
          gradientDirection: "to-bottom-right",
          opacity: 1,
          shadowEnabled: true,
          shadowColor: "#EC4899",
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },

        // Gradient 3: Green-blue
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000002083",
          layout: { x: 0.66, y: 0.75, width: 0.27, height: 0.07 },
          shapeType: "rounded-rectangle",
          borderRadius: 12,
          gradientEnabled: true,
          gradientColors: ["#22c55e", "#3b82f6"],
          gradientDirection: "to-bottom",
          opacity: 1,
          shadowEnabled: true,
          shadowColor: "#22c55e",
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },

        // Personalized footer (visible when name entered)
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002090",
          layout: { x: 0.06, y: 0.85, width: 0.88, height: 0.025 },
          content: "",
          fontSize: 13,
          color: "#555",
          fontWeight: "normal",
          textAlign: "center",
          bindings: { content: "name" },
          visibleWhen: "name",
        },

        // Default footer
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002091",
          layout: { x: 0.06, y: 0.85, width: 0.88, height: 0.025 },
          content: "Enter your name on the home screen to personalize",
          fontSize: 12,
          color: "#333",
          fontWeight: "normal",
          textAlign: "center",
          visibleWhen: "!name",
        },

        // Tech footer
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000002095",
          layout: { x: 0.06, y: 0.90, width: 0.88, height: 0.02 },
          content: "Score \u2022 Conditionals \u2022 Toggles \u2022 Bindings \u2022 Gradients",
          fontSize: 10,
          color: "#2a2a2a",
          fontWeight: "normal",
          textAlign: "center",
        },
      ],
    },
  },
};

function collectPersistedVarNames(appVars: Variable[], screenVars: Variable[]): Set<string> {
  const names = new Set<string>();
  for (const v of [...appVars, ...screenVars]) {
    if (v.persist) names.add(v.name);
  }
  return names;
}

interface SlateEditorProps {
  slateId: string;
  slateName: string;
  onCloseSlate: () => void;
  onDeleteSlate: () => void;
  onRenameSlate: (name: string) => void;
  storage: StorageProvider;
  shareRole?: 'viewer' | 'editor';
}

export function SlateEditor({
  slateId,
  slateName,
  onCloseSlate,
  onDeleteSlate,
  onRenameSlate,
  storage,
  shareRole,
}: SlateEditorProps) {
  const {
    slate,
    setSlate,
    setSlateRaw,
    undo,
    redo,
    canUndo,
    canRedo,
    entries,
    currentId,
    restoreToId,
    startBatch,
    endBatch,
    historyVersion,
    loadHistory,
    getRedoMap,
    createBranch,
    addBranchEntry,
  } = useUndoHistory(defaultSlate);
  const isPreviewOnly = shareRole === 'viewer';
  const [isEditMode, setIsEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [currentScreenId, setCurrentScreenId] = useState(SCREEN_ID);
  const currentScreenIdRef = useRef(currentScreenId);
  currentScreenIdRef.current = currentScreenId;
  const [navStack, setNavStack] = useState<string[]>([]);
  const isEditModeLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historySaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slateRef = useRef(slate);
  slateRef.current = slate;
  const initFromSlate = useRuntimeStore((s) => s.initFromSlate);
  const navigateToScreen = useRuntimeStore((s) => s.navigateToScreen);
  const runtimeVariables = useRuntimeStore((s) => s.variables);

  // Collaboration: receive remote changes via setSlateRaw (no undo history)
  const isSyncable = 'joinCollabChannel' in storage;
  const { collaborators, broadcastChange } = useCollaboration({
    storage: storage as SyncableStorageProvider,
    slateId,
    onRemoteChange: (remoteSlate) => {
      setSlateRaw(remoteSlate);
    },
    enabled: isSyncable,
  });

  // Load slate and settings on mount
  useEffect(() => {
    (async () => {
      try {
        const [bp, editMode, persistedJson, savedHistory] = await Promise.all([
          storage.loadSlate(slateId),
          AsyncStorage.getItem("settings_editMode"),
          AsyncStorage.getItem(`runtime_persisted_variables_${slateId}`),
          storage.loadHistory(slateId),
        ]);

        const loadedBp = bp ?? defaultSlate;

        // Restore history if available, otherwise just set the raw slate
        if (savedHistory && savedHistory.entries.length > 0) {
          loadHistory(savedHistory.entries, savedHistory.currentId, savedHistory.redoMap);
        } else {
          setSlateRaw(loadedBp);
        }
        setCurrentScreenId(loadedBp.initial_screen_id);

        if (editMode !== null) setIsEditMode(editMode === "true");
        isEditModeLoaded.current = true;

        // Init runtime store
        const screenId = loadedBp.initial_screen_id;
        const screen = loadedBp.screens[screenId];
        const appVars = loadedBp.variables ?? [];
        const screenVars = screen?.variables ?? [];
        const persisted = persistedJson ? JSON.parse(persistedJson) : {};
        initFromSlate(appVars, screenVars, persisted);

        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();

    // Flush save on unmount
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        storage.saveSlate(slateId, slateRef.current);
      }
      if (persistTimeout.current) {
        clearTimeout(persistTimeout.current);
      }
      if (historySaveTimeout.current) {
        clearTimeout(historySaveTimeout.current);
      }
    };
  }, [slateId]);

  // Debounced save on slate change + broadcast for collaboration
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      storage.saveSlate(slateId, slate);
    }, 500);
    // Broadcast to collaborators
    if (isSyncable) {
      broadcastChange(slate);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [slate, loaded, slateId]);

  // Debounced save of undo history
  useEffect(() => {
    if (!loaded) return;
    if (historySaveTimeout.current) clearTimeout(historySaveTimeout.current);
    historySaveTimeout.current = setTimeout(() => {
      storage.saveHistory(slateId, {
        entries,
        currentId,
        redoMap: getRedoMap(),
      });
    }, 1000);
    return () => {
      if (historySaveTimeout.current) clearTimeout(historySaveTimeout.current);
    };
  }, [historyVersion, loaded, slateId]);

  // Persist edit mode
  useEffect(() => {
    if (!isEditModeLoaded.current) return;
    AsyncStorage.setItem("settings_editMode", String(isEditMode));
  }, [isEditMode]);

  // Re-initialize runtime store when slate variables change
  useEffect(() => {
    if (!loaded) return;
    const screen = slate.screens[currentScreenId];
    const appVars = slate.variables ?? [];
    const screenVars = screen?.variables ?? [];
    initFromSlate(appVars, screenVars, {});
  }, [slate.variables, currentScreenId, slate.screens[currentScreenId]?.variables]);

  // Debounced persist of runtime variables
  useEffect(() => {
    if (!loaded) return;
    if (persistTimeout.current) clearTimeout(persistTimeout.current);
    persistTimeout.current = setTimeout(() => {
      const screen = slate.screens[currentScreenIdRef.current];
      const persistedNames = collectPersistedVarNames(
        slate.variables ?? [],
        screen?.variables ?? []
      );
      if (persistedNames.size === 0) return;
      const toSave: Record<string, unknown> = {};
      for (const name of persistedNames) {
        if (name in runtimeVariables) {
          toSave[name] = runtimeVariables[name];
        }
      }
      AsyncStorage.setItem(
        `runtime_persisted_variables_${slateId}`,
        JSON.stringify(toSave)
      );
    }, 1000);
    return () => {
      if (persistTimeout.current) clearTimeout(persistTimeout.current);
    };
  }, [runtimeVariables, loaded, slateId]);

  const handleCloseSlate = useCallback(async () => {
    // Flush pending saves
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
      await storage.saveSlate(slateId, slateRef.current);
    }
    if (historySaveTimeout.current) {
      clearTimeout(historySaveTimeout.current);
      historySaveTimeout.current = null;
    }
    await storage.saveHistory(slateId, {
      entries,
      currentId,
      redoMap: getRedoMap(),
    });
    onCloseSlate();
  }, [slateId, onCloseSlate, entries, currentId, getRedoMap]);

  const updateScreenComponents = useCallback(
    (fn: (components: Component[]) => Component[], description = "Updated components") => {
      setSlate((prev) => {
        const sid = currentScreenIdRef.current;
        const screen = prev.screens[sid];
        if (!screen) return prev;
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [sid]: { ...screen, components: fn(screen.components) },
          },
        };
      }, description);
    },
    [setSlate]
  );

  const handleAddComponent = useCallback(
    (component: Component) => {
      updateScreenComponents((components) => [...components, component], `Added ${component.type}`);
    },
    [updateScreenComponents]
  );

  const handleDeleteComponent = useCallback(
    (id: string) => {
      updateScreenComponents((components) => deepDeleteComponent(components, id), "Deleted component");
    },
    [updateScreenComponents]
  );

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) =>
          c.type === "text" ? { ...c, content } : c
        ),
        "Edited text"
      );
    },
    [updateScreenComponents]
  );

  const handleStyleChange = useCallback(
    (id: string, updates: ComponentStyleUpdates) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) => ({ ...c, ...updates })),
        "Changed style"
      );
    },
    [updateScreenComponents]
  );

  const handleComponentUpdate = useCallback(
    (id: string, layout: Layout) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) => ({ ...c, layout })),
        "Moved component"
      );
    },
    [updateScreenComponents]
  );

  const handleComponentReplace = useCallback(
    (id: string, replacement: Component) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, () => replacement),
        "Replaced component"
      );
    },
    [updateScreenComponents]
  );

  const handleAddChildComponent = useCallback(
    (parentId: string, child: Component) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, parentId, (c) => {
          if (c.type !== "container") return c;
          return { ...c, children: [...(c.children ?? []), child] };
        }),
        "Added child"
      );
    },
    [updateScreenComponents]
  );

  const handleScreenUpdate = useCallback(
    (updatedScreen: Screen) => {
      setSlate((prev) => {
        const sid = currentScreenIdRef.current;
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [sid]: updatedScreen,
          },
        };
      }, "Updated screen");
    },
    [setSlate]
  );

  const handleResetAndBuild = useCallback(() => {
    setSlate((prev) => {
      const sid = currentScreenIdRef.current;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [sid]: { ...prev.screens[sid], components: [makeBackgroundShape()] },
        },
      };
    }, "Reset canvas");
    setIsEditMode(true);
  }, [setSlate]);

  // --- Screen navigation (preview mode) ---
  const handleNavigate = useCallback((targetScreenId: string) => {
    setNavStack((prev) => [...prev, currentScreenIdRef.current]);
    setCurrentScreenId(targetScreenId);
    const bp = slateRef.current;
    const targetScreen = bp.screens[targetScreenId];
    navigateToScreen(bp.variables ?? [], targetScreen?.variables ?? []);
  }, [navigateToScreen]);

  const handleNavigateBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const previousId = next.pop()!;
      setCurrentScreenId(previousId);
      const bp = slateRef.current;
      const prevScreen = bp.screens[previousId];
      navigateToScreen(bp.variables ?? [], prevScreen?.variables ?? []);
      return next;
    });
  }, [navigateToScreen]);

  // --- Screen management (edit mode) ---
  const handleSwitchScreen = useCallback((screenId: string) => {
    setCurrentScreenId(screenId);
    setNavStack([]);
  }, []);

  const handleAddScreen = useCallback(() => {
    const newId = uuid();
    const newScreen: Screen = {
      id: newId,
      name: `Screen ${Object.keys(slateRef.current.screens).length + 1}`,
      components: [makeBackgroundShape()],
    };
    setSlate((prev) => ({
      ...prev,
      screens: { ...prev.screens, [newId]: newScreen },
    }), "Added screen");
    setCurrentScreenId(newId);
    setNavStack([]);
  }, [setSlate]);

  const handleDeleteScreen = useCallback((screenId: string) => {
    setSlate((prev) => {
      const ids = Object.keys(prev.screens);
      if (ids.length <= 1) return prev;
      const { [screenId]: _, ...rest } = prev.screens;
      const remainingIds = Object.keys(rest);
      const newInitial = prev.initial_screen_id === screenId
        ? remainingIds[0]
        : prev.initial_screen_id;
      return { ...prev, screens: rest, initial_screen_id: newInitial };
    }, "Deleted screen");
    if (currentScreenIdRef.current === screenId) {
      const bp = slateRef.current;
      const ids = Object.keys(bp.screens).filter((id) => id !== screenId);
      setCurrentScreenId(ids[0] ?? bp.initial_screen_id);
    }
    setNavStack([]);
  }, [setSlate]);

  const handleRenameScreen = useCallback((screenId: string, name: string) => {
    setSlate((prev) => {
      const screen = prev.screens[screenId];
      if (!screen) return prev;
      return {
        ...prev,
        screens: { ...prev.screens, [screenId]: { ...screen, name } },
      };
    }, "Renamed screen");
  }, [setSlate]);

  const handleSetInitialScreen = useCallback((screenId: string) => {
    setSlate((prev) => ({ ...prev, initial_screen_id: screenId }), "Set initial screen");
  }, [setSlate]);


  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Canvas
        slate={slate}
        screenId={currentScreenId}
        isEditMode={isPreviewOnly ? false : isEditMode}
        onToggleEditMode={isPreviewOnly ? () => {} : () => setIsEditMode((v) => !v)}
        isPreviewOnly={isPreviewOnly}
        onComponentUpdate={handleComponentUpdate}
        onContentChange={handleContentChange}
        onStyleChange={handleStyleChange}
        onAddComponent={handleAddComponent}
        onCloseSlate={handleCloseSlate}
        onDeleteSlate={onDeleteSlate}
        slateName={slateName}
        onRenameSlate={onRenameSlate}
        onResetAndBuild={handleResetAndBuild}
        onNavigate={handleNavigate}
        onNavigateBack={handleNavigateBack}
        navStack={navStack}
        onScreenUpdate={handleScreenUpdate}
        onDeleteComponent={handleDeleteComponent}
        onComponentReplace={handleComponentReplace}
        onAddChildComponent={handleAddChildComponent}
        onSlateChange={(updater) => {
          setSlate(
            typeof updater === "function" ? updater : () => updater,
            "Updated slate"
          );
        }}
        currentScreenId={currentScreenId}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        entries={entries}
        currentId={currentId}
        restoreToId={restoreToId}
        createBranch={createBranch}
        addBranchEntry={addBranchEntry}
        startBatch={startBatch}
        endBatch={endBatch}
        initialScreenId={slate.initial_screen_id}
        screenActions={{
          onSwitchScreen: handleSwitchScreen,
          onAddScreen: handleAddScreen,
          onDeleteScreen: handleDeleteScreen,
          onRenameScreen: handleRenameScreen,
          onSetInitialScreen: handleSetInitialScreen,
        }}
        slateId={slateId}
        storage={storage}
      />
    </GestureHandlerRootView>
  );
}
