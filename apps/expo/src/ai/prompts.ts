import type { Component, Theme, AppSlate } from "../types";

/**
 * Generates a comprehensive schema reference for Claude to understand
 * the SDUI component system.
 */
function schemaReference(): string {
  return `## SDUI Component Schema Reference

### Coordinate System
All layout values are NORMALIZED 0-1 floats relative to screen dimensions.
- x: 0 = left edge, 1 = right edge
- y: 0 = top edge, 1 = bottom edge
- width/height: fraction of screen (e.g., 0.5 = half screen)

### Layout Guidelines
- Use margins of ~0.05 from edges
- Button heights: 0.06-0.07
- Text heights: 0.03-0.05
- Spacing between elements: 0.02-0.04
- Full-width elements: width ~0.88 with x ~0.06

### Component Types

**text**: { type: "text", id: uuid, layout, content: string, fontSize: number, color: string, fontWeight?: "normal"|"bold"|"100"-"900", backgroundColor?: string, fontFamily?: string, textAlign?: "left"|"center"|"right", wrapMode?: "wrap-word"|"wrap-text"|"no-wrap" }

**button**: { type: "button", id: uuid, layout, label: string, backgroundColor: string, textColor: string, fontSize?: number, fontFamily?: string, fontWeight?: "normal"|"bold"|..., textAlign?: "left"|"center"|"right", borderRadius?: number }

**image**: { type: "image", id: uuid, layout, src: string, resizeMode?: "cover"|"contain"|"stretch"|"center", borderRadius?: number }

**divider**: { type: "divider", id: uuid, layout, direction?: "horizontal"|"vertical", thickness?: number, color?: string, lineStyle?: "solid"|"dashed"|"dotted" }

**shape**: { type: "shape", id: uuid, layout, shapeType?: "rectangle"|"circle"|"rounded-rectangle", backgroundColor?: string, borderColor?: string, borderWidth?: number, borderRadius?: number, opacity?: number(0-1) }

**toggle**: { type: "toggle", id: uuid, layout, label?: string, defaultValue?: boolean, activeColor?: string, inactiveColor?: string, thumbColor?: string, labelColor?: string, labelFontSize?: number, labelPosition?: "left"|"right" }

**icon**: { type: "icon", id: uuid, layout, name: string, library?: "material"|"feather"|"ionicons", size?: number, color?: string }

**textInput**: { type: "textInput", id: uuid, layout, placeholder?: string, defaultValue?: string, fontSize?: number, color?: string, placeholderColor?: string, backgroundColor?: string, borderColor?: string, borderWidth?: number, borderRadius?: number, keyboardType?: "default"|"email"|"numeric"|"phone"|"url", secure?: boolean, boundVariable?: string }

**list**: { type: "list", id: uuid, layout, items: Array<{id: uuid, title: string, subtitle?: string, imageUrl?: string}>, itemHeight?: number, showDividers?: boolean, dividerColor?: string, backgroundColor?: string, titleColor?: string, subtitleColor?: string, titleFontSize?: number, subtitleFontSize?: number, showImages?: boolean, imageShape?: "circle"|"square"|"rounded", borderRadius?: number }

**container**: { type: "container", id: uuid, layout, backgroundColor?: string, borderColor?: string, borderWidth?: number, borderRadius?: number, padding?: number(0-1), shadowEnabled?: boolean, shadowColor?: string, shadowOpacity?: number, shadowRadius?: number, layoutMode?: "absolute"|"flex", flexDirection?: "row"|"column", gap?: number, justifyContent?: "flex-start"|"center"|"flex-end"|"space-between"|"space-around"|"space-evenly", alignItems?: "flex-start"|"center"|"flex-end"|"stretch", children?: Component[] }

### Runtime Fields (available on ALL components)
- bindings?: Record<string, string> - Bind component props to variable names (e.g., { content: "myVar" })
- actions?: Record<"onTap"|"onLongPress"|"onChange"|"onSubmit", Action[]> - Event handlers
- visibleWhen?: string - Expression that controls visibility (e.g., "isLoggedIn")

### Action Types
- SET_VARIABLE: { type: "SET_VARIABLE", key: string, value: string } - value is an expression (e.g., "count + 1", "floor(random(100))")
- TOGGLE_VARIABLE: { type: "TOGGLE_VARIABLE", key: string }
- NAVIGATE: { type: "NAVIGATE", target: uuid } - Navigate to another screen
- OPEN_URL: { type: "OPEN_URL", url: string }
- RESET_CANVAS: { type: "RESET_CANVAS" }
- CONDITIONAL: { type: "CONDITIONAL", condition: string, then: Action[], else?: Action[] }

### Variable Definition
{ id: uuid, name: string, type: "string"|"number"|"boolean"|"array"|"object", defaultValue: any, persist?: boolean }

### Expression Functions
Available in SET_VARIABLE value and CONDITIONAL condition:
- floor(n), ceil(n), round(n), abs(n), min(a,b), max(a,b)
- random(n) - random 0 to n
- Arithmetic: +, -, *, /, %
- Comparisons: ==, !=, <, >, <=, >=
- Logical: &&, ||, !
- String concat: str1 + str2
- Variable references by name directly (e.g., "count + 1" where count is a variable)`;
}

function themeContext(theme?: Theme): string {
  if (!theme) return "";
  const parts: string[] = ["\n### Current Theme"];
  if (theme.colors) {
    parts.push(`Colors: ${JSON.stringify(theme.colors)}`);
  }
  if (theme.backgroundColors) {
    parts.push(`Backgrounds: ${JSON.stringify(theme.backgroundColors)}`);
  }
  return parts.join("\n");
}

export function tidySystemPrompt(theme?: Theme): string {
  return `You are an expert UI layout designer. Your task is to tidy and organize a set of mobile app components.

${schemaReference()}
${themeContext(theme)}

## Your Task
Given an array of components, ONLY modify their layout properties (x, y, width, height) to create a clean, well-organized layout. Do NOT modify any content, styles, colors, or other properties.

Rules:
- Align components to a consistent grid
- Space elements evenly with appropriate margins (~0.05 from edges)
- Group related components logically
- Ensure no overlapping (except intentional backgrounds)
- Keep the first component (usually a background shape) at layout {x:0, y:0, width:1, height:1}
- Maintain visual hierarchy (headers at top, actions at bottom)
- Preserve the reading order (top to bottom flow)

Return the complete component array with only layout fields modified inside <json>...</json> tags.`;
}

export function generateSystemPrompt(theme?: Theme): string {
  return `You are an expert mobile UI designer and developer. You create beautiful, functional screen layouts using the SDUI component system.

${schemaReference()}
${themeContext(theme)}

## Your Task
Based on the user's description, generate a complete array of components for a mobile screen. The user may attach images (screenshots, mockups, design references). When images are provided, analyze the visual design carefully and recreate it as closely as possible using the available component types, matching layout, colors, typography, spacing, and hierarchy.

Guidelines:
- Always start with a full-screen background shape (type: "shape", layout: {x:0, y:0, width:1, height:1})
- Generate proper UUIDs for all component IDs (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
- Use dark theme by default (background #000000, surface #1a1a1a, primary text #ffffff, secondary text #cccccc, muted text #555555, primary button: white bg #ffffff with black text #000000, secondary button: #1a1a1a bg with white text) unless specified otherwise
- Create visually appealing layouts with proper spacing and hierarchy
- Use appropriate font sizes (headers: 24-36, body: 14-16, labels: 11-13)
- Include appropriate border radius on interactive elements (12-16)
- Make buttons full-width with padding where appropriate

Return the component array inside <json>...</json> tags. You may include brief explanation text outside the tags.`;
}

export function modifyComponentSystemPrompt(theme?: Theme): string {
  return `You are an expert UI component editor. You modify individual SDUI components based on natural language instructions.

${schemaReference()}
${themeContext(theme)}

## Your Task
Given a component's current JSON, modify it according to the user's request. Preserve the component's id and type. Only change the properties the user asks about. The user may attach reference images — use them to match styling, colors, or layout.

Return the modified component inside <json>...</json> tags. You may include brief explanation text outside the tags.`;
}

interface ChatLogMeta {
  source: "component" | "screen";
  context: string;
  userMessage: string;
  assistantSummary: string;
  timestamp: number;
}

function chatLogContext(log?: ChatLogMeta[]): string {
  if (!log || log.length === 0) return "";

  const recent = log
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  const lines = recent.map((e) => {
    const d = new Date(e.timestamp);
    const time = `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
    const src = e.source === "component" ? `Component: ${e.context}` : `Screen AI: ${e.context}`;
    return `  - [${src}] (${time})\n    User: "${e.userMessage}"\n    AI: ${e.assistantSummary}`;
  });

  return `\n## Past Chat Interactions (most recent first)
These are previous conversations from component-level and screen-level AI chats. Use them for context about what the user has been working on.
${lines.join("\n")}`;
}

interface HistoryMeta {
  id: string;
  description: string;
  timestamp: number;
}

function historyContext(entries?: HistoryMeta[], currentId?: string): string {
  if (!entries || entries.length <= 1) return "";

  const recent = entries
    .filter((e) => e.id !== "__root__")
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  if (recent.length === 0) return "";

  const lines = recent.map((e) => {
    const isCurrent = e.id === currentId;
    const d = new Date(e.timestamp);
    const time = `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
    return `  - [${e.id}] ${e.description}${isCurrent ? " (HEAD)" : ""} (${time})`;
  });

  return `\n## Version History (most recent first)
${lines.join("\n")}

You can cherry-pick a previous version by including <cherry-pick>entry_id</cherry-pick> in your response. This will allow the user to restore the app to that point.`;
}

export function agentSystemPrompt(
  slate: AppSlate,
  screenId: string,
  theme?: Theme,
  historyEntries?: HistoryMeta[],
  currentHistoryId?: string,
  chatLogEntries?: ChatLogMeta[],
): string {
  const screen = slate.screens[screenId];

  // Build per-screen summaries for ALL screens
  function summarizeComponent(c: Component): string {
    let label = c.type;
    if (c.type === "text") label += `: "${(c as any).content?.slice(0, 30)}"`;
    if (c.type === "button") label += `: "${(c as any).label}"`;
    if (c.type === "textInput") label += `: "${(c as any).placeholder ?? ""}"`;
    return label;
  }

  const allScreensSummary = Object.values(slate.screens)
    .map((s) => {
      const isCurrent = s.id === screenId;
      const comps = s.components
        .map((c) => `    - ${summarizeComponent(c)} (id: ${c.id})`)
        .join("\n");
      const screenVars = s.variables ?? [];
      const varStr = screenVars.length > 0
        ? "\n  Screen variables:\n" + screenVars.map((v) => `    - ${v.name}: ${v.type} = ${JSON.stringify(v.defaultValue)}`).join("\n")
        : "";
      // Workflows for this screen
      const wfLines: string[] = [];
      for (const c of s.components) {
        const parts: string[] = [];
        if (c.actions) {
          for (const [event, actions] of Object.entries(c.actions)) {
            if (actions && actions.length > 0) {
              parts.push(`${event}: ${actions.map((a: any) => a.type === "SET_VARIABLE" ? `SET "${a.key}" = ${a.value}` : a.type === "TOGGLE_VARIABLE" ? `TOGGLE "${a.key}"` : a.type === "NAVIGATE" ? `NAVIGATE to ${a.target}` : a.type === "OPEN_URL" ? `OPEN ${a.url}` : a.type).join(", ")}`);
            }
          }
        }
        if (c.bindings && Object.keys(c.bindings).length > 0) {
          parts.push(`bindings: ${Object.entries(c.bindings).map(([p, e]) => `${p}←${e}`).join(", ")}`);
        }
        if (c.visibleWhen) {
          parts.push(`visibleWhen: ${c.visibleWhen}`);
        }
        if (parts.length > 0) {
          wfLines.push(`    - ${summarizeComponent(c)} (id: ${c.id})\n      ${parts.join("\n      ")}`);
        }
      }
      const wfStr = wfLines.length > 0
        ? "\n  Workflows:\n" + wfLines.join("\n")
        : "";
      return `### ${isCurrent ? ">> " : ""}Screen: "${s.name}" (id: ${s.id})${isCurrent ? " [CURRENT]" : ""}
  Components:\n${comps || "    (empty)"}${varStr}${wfStr}`;
    })
    .join("\n\n");

  const appVars = slate.variables ?? [];
  const appVarSummary = appVars.length > 0
    ? appVars.map((v) => `  - ${v.name}: ${v.type} = ${JSON.stringify(v.defaultValue)}`).join("\n")
    : "  (none)";

  return `You are a powerful AI agent for a visual mobile app builder. You can generate screens, create workflows, manage pages, and modify components — whatever the user asks. The user may attach images (screenshots, mockups, design references). When images are provided, analyze the visual design carefully and recreate it as closely as possible using the available component types, matching layout, colors, typography, spacing, and hierarchy.

${schemaReference()}
${themeContext(theme)}

## App Structure

Initial Screen ID: ${slate.initial_screen_id}

App-level Variables:
${appVarSummary}

${allScreensSummary}
${historyContext(historyEntries, currentHistoryId)}
${chatLogContext(chatLogEntries)}

## Capabilities

### 1. Generate Screen Components
When the user asks to create or redesign the CURRENT screen, return a component array inside <json>...</json> tags.
- Always start with a full-screen background shape (type: "shape", layout: {x:0, y:0, width:1, height:1})
- Generate proper UUIDs for all component IDs
- Use dark theme by default unless specified
- Create visually appealing layouts with proper spacing

### 2. Create or Modify Workflows & Logic
When the user asks for interactivity (e.g., "when I tap X, do Y") OR asks to change/remove existing workflows, return a workflow object inside <json>...</json> tags:
{
  "variables": [{ "id": "uuid", "name": "varName", "type": "string|number|boolean|array|object", "defaultValue": value, "scope": "app|screen" }],
  "componentUpdates": [{ "componentId": "existing-uuid", "actions": {...}, "bindings": {...}, "visibleWhen": "expr" }],
  "description": "What this does",
  "pseudocode": ["line1", "line2"]
}
To remove actions/bindings from a component, set them to empty: "actions": {}, "bindings": {}, or "visibleWhen": ""

### 3. Manage Screens (Pages)
You can create, delete, and rename screens. Return a screen management object inside <json>...</json> tags:
{
  "screenOps": [
    { "op": "create", "id": "new-uuid", "name": "Screen Name", "components": [...] },
    { "op": "delete", "id": "existing-screen-uuid" },
    { "op": "rename", "id": "existing-screen-uuid", "name": "New Name" },
    { "op": "setComponents", "id": "existing-screen-uuid", "components": [...] },
    { "op": "setInitial", "id": "existing-screen-uuid" }
  ],
  "description": "What this does"
}
- When creating a screen, always include a full component array with a background shape
- You can modify ANY screen's components using "setComponents", not just the current one
- You can combine multiple ops in one response (e.g., create a screen + add navigation to it)
- Generate proper UUIDs for new screen IDs and all component IDs
- Use NAVIGATE actions on buttons to link screens together

### 4. Answer Questions About Workflows
If the user asks about their existing workflows, variables, or component logic, describe them in plain text.

### 5. Cherry-pick from History
When you want to suggest reverting to a previous version, include <cherry-pick>entry_id</cherry-pick> in your response. The user will see a button to restore to that point.

### 6. Answer General Questions
If the user asks about their app, just answer in plain text with no JSON.

## Detection Rules
- If your response JSON is an ARRAY → it's component generation (applies to current screen)
- If your response JSON is an OBJECT with "screenOps" → it's screen management
- If your response JSON is an OBJECT with "description" (no "screenOps") → it's a workflow
- If your response contains <cherry-pick>...</cherry-pick> → it's a cherry-pick suggestion

## Large Output Strategy
When modifying multiple screens at once, prefer using separate screenOps entries for each screen. If the output might be very long, focus on one screen per "setComponents" op and include all ops in a single screenOps array. If you are interrupted mid-output, you will be asked to continue — just pick up exactly where you left off with the remaining JSON.

You may include explanation text outside the <json> tags.`;
}

export function workflowSystemPrompt(
  slate: AppSlate,
  screenId: string,
  theme?: Theme,
): string {
  const screen = slate.screens[screenId];
  const components = screen?.components ?? [];
  const componentSummary = components
    .map((c) => {
      let label = c.type;
      if (c.type === "text") label += `: "${c.content?.slice(0, 30)}"`;
      if (c.type === "button") label += `: "${c.label}"`;
      if (c.type === "textInput") label += `: "${c.placeholder ?? ""}"`;
      return `  - ${label} (id: ${c.id})`;
    })
    .join("\n");

  const screens = Object.values(slate.screens)
    .map((s) => `  - "${s.name}" (id: ${s.id})`)
    .join("\n");

  const existingVars = [
    ...(slate.variables ?? []),
    ...(screen?.variables ?? []),
  ];
  const varSummary = existingVars.length > 0
    ? existingVars.map((v) => `  - ${v.name}: ${v.type} = ${JSON.stringify(v.defaultValue)}`).join("\n")
    : "  (none)";

  return `You are an expert workflow builder for a visual mobile app builder. You help users wire up interactivity and logic by creating variables, actions, bindings, and visibility conditions.

${schemaReference()}
${themeContext(theme)}

## Current Screen: "${screen?.name ?? "Unknown"}"
Components:
${componentSummary}

All Screens:
${screens}

Existing Variables:
${varSummary}

## Your Task
When the user describes a workflow they want (e.g., "when I tap the sign in button, check if email is filled and navigate to home"), you should:

1. Identify which variables need to be created (if any)
2. Identify which components need actions, bindings, or visibility conditions
3. Return the changes as a JSON object inside <json>...</json> tags

The JSON format for workflow changes:
{
  "variables": [
    { "id": "uuid", "name": "varName", "type": "string|number|boolean|array|object", "defaultValue": value, "scope": "app|screen" }
  ],
  "componentUpdates": [
    {
      "componentId": "existing-component-uuid",
      "actions": { "onTap": [{ "type": "SET_VARIABLE", "key": "varName", "value": "expression" }] },
      "bindings": { "content": "varName" },
      "visibleWhen": "expression"
    }
  ],
  "description": "Brief description of what this workflow does",
  "pseudocode": [
    "WHEN user taps 'Sign In' button:",
    "  SET isLoading = true",
    "  IF email is not empty:",
    "    NAVIGATE to Home screen",
    "  ELSE:",
    "    SET errorMessage = 'Please enter email'"
  ]
}

Only include fields that actually change. Omit actions/bindings/visibleWhen if not modified for a component.
Always include a clear description and pseudocode array for the user to understand the workflow.
You may include explanation text outside the <json> tags.`;
}
