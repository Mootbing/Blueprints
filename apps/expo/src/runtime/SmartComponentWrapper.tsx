import React from "react";
import { Pressable } from "react-native";
import { useRuntimeStore } from "./useRuntimeStore";
import { executeActions } from "./executeActions";
import { evaluate } from "./evaluate";
import type { Component } from "../types";

interface SmartComponentWrapperProps {
  component: Component;
  isEditMode: boolean;
  onNavigate?: (screenId: string) => void;
  onResetAndBuild?: () => void;
  onOpenAgent?: (prompt: string) => void;
  children: (resolvedComponent: Component) => React.ReactNode;
}

export function SmartComponentWrapper({
  component,
  isEditMode,
  onNavigate,
  onResetAndBuild,
  onOpenAgent,
  children,
}: SmartComponentWrapperProps) {
  const variables = useRuntimeStore((state) => state.variables);
  const store = useRuntimeStore();

  // In edit mode, pass through static props untouched
  if (isEditMode) {
    return <>{children(component)}</>;
  }

  // Check visibility
  if (component.visibleWhen) {
    const visible = evaluate(component.visibleWhen, { variables });
    if (!visible) return null;
  }

  // Resolve bindings over static props
  let resolvedComponent = component;
  if (component.bindings) {
    const overrides: Record<string, unknown> = {};
    for (const [prop, expr] of Object.entries(component.bindings)) {
      overrides[prop] = evaluate(expr, { variables });
    }
    resolvedComponent = { ...component, ...overrides } as Component;
  }

  // If component has event handlers (actions), wrap with Pressable for onTap/onLongPress
  const actions = component.actions;
  const hasOnTap = actions?.onTap && actions.onTap.length > 0;
  const hasOnLongPress = actions?.onLongPress && actions.onLongPress.length > 0;

  if (hasOnTap || hasOnLongPress) {
    const handleTap = hasOnTap
      ? async () => {
          await executeActions(actions!.onTap!, store, {
            navigate: (id) => onNavigate?.(id),
            resetAndBuild: onResetAndBuild,
            openAgent: onOpenAgent,
          });
        }
      : undefined;

    const handleLongPress = hasOnLongPress
      ? async () => {
          await executeActions(actions!.onLongPress!, store, {
            navigate: (id) => onNavigate?.(id),
            resetAndBuild: onResetAndBuild,
            openAgent: onOpenAgent,
          });
        }
      : undefined;

    return (
      <Pressable
        onPress={handleTap}
        onLongPress={handleLongPress}
        style={{ flex: 1 }}
      >
        {children(resolvedComponent)}
      </Pressable>
    );
  }

  return <>{children(resolvedComponent)}</>;
}
