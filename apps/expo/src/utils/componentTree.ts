import type { Component } from "../types";
import { uuid } from "./uuid";

export function deepCloneComponent(comp: Component): Component {
  const cloned = { ...comp, id: uuid() };
  if (cloned.type === "container" && cloned.children) {
    cloned.children = cloned.children.map(deepCloneComponent);
  }
  return cloned;
}

export function deepUpdateComponent(
  components: Component[],
  targetId: string,
  updater: (comp: Component) => Component
): Component[] {
  return components.map((c) => {
    if (c.id === targetId) return updater(c);
    if (c.type === "container" && c.children) {
      const updated = deepUpdateComponent(c.children, targetId, updater);
      if (updated !== c.children) return { ...c, children: updated };
    }
    return c;
  });
}

export function deepDeleteComponent(
  components: Component[],
  targetId: string
): Component[] {
  const filtered = components.filter((c) => c.id !== targetId);
  if (filtered.length < components.length) return filtered;
  return components.map((c) => {
    if (c.type === "container" && c.children) {
      const updated = deepDeleteComponent(c.children, targetId);
      if (updated !== c.children) return { ...c, children: updated };
    }
    return c;
  });
}

export function findComponent(components: Component[], id: string): Component | undefined {
  for (const c of components) {
    if (c.id === id) return c;
    if (c.type === "container" && c.children) {
      const found = findComponent(c.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export interface FlatNode {
  component: Component;
  depth: number;
  parentId: string | null;
  indexInParent: number;
  path: string;
}

/**
 * Flatten component tree in reverse order (higher z-index first).
 * Used by TreeView for layer ordering.
 */
export function flattenComponentTree(
  components: Component[],
  depth = 0,
  parentId: string | null = null,
  parentPath = "",
  reverse = true
): FlatNode[] {
  const result: FlatNode[] = [];
  const start = reverse ? components.length - 1 : 0;
  const end = reverse ? -1 : components.length;
  const step = reverse ? -1 : 1;
  for (let i = start; i !== end; i += step) {
    const comp = components[i];
    const path = parentPath ? `${parentPath}/${comp.id}` : comp.id;
    result.push({ component: comp, depth, parentId, indexInParent: i, path });
    if (comp.type === "container" && comp.children) {
      result.push(...flattenComponentTree(comp.children, depth + 1, comp.id, path, reverse));
    }
  }
  return result;
}

const BACKGROUND_ID = "00000000-0000-0000-0000-00000000000b";

export function getComponentLabel(
  comp: Component,
  opts?: { includeType?: boolean }
): string {
  if (comp.id === BACKGROUND_ID) return "BACKGROUND";

  if (opts?.includeType) {
    const type = comp.type.charAt(0).toUpperCase() + comp.type.slice(1);
    if (comp.type === "text") return `${type}: "${comp.content.slice(0, 20)}${comp.content.length > 20 ? "..." : ""}"`;
    if (comp.type === "button") return `${type}: "${comp.label}"`;
    if (comp.type === "icon") return `${type}: ${comp.name}`;
    if (comp.type === "textInput") return `${type}: ${comp.placeholder ?? "input"}`;
    if (comp.type === "image") return `${type}`;
    return type;
  }

  let label = "";
  if ("content" in comp && typeof comp.content === "string") label = comp.content;
  else if ("label" in comp && typeof comp.label === "string") label = comp.label;
  else if ("placeholder" in comp && typeof comp.placeholder === "string") label = comp.placeholder;
  else if ("name" in comp && typeof comp.name === "string") label = comp.name;
  else label = comp.type;

  return label.length > 25 ? label.slice(0, 25) + "..." : label;
}
