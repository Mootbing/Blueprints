export type {
  NormalizedFloat,
  Layout,
  Variable,
  Action,
  SetVariableAction,
  ToggleVariableAction,
  NavigateAction,
  OpenUrlAction,
  ResetCanvasAction,
  OpenAgentAction,
  FetchAction,
  RunCodeAction,
  ConditionalAction,
  Bindings,
  EventHandlers,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  DividerComponent,
  ShapeComponent,
  ToggleComponent,
  IconComponent,
  TextInputComponent,
  ListItem,
  ListComponent,
  ContainerComponent,
  Component,
  WorkflowBlock,
  Workflow,
  Screen,
  Theme,
  AppSlate,
} from "@shared/schema";

export {
  NormalizedFloat as NormalizedFloatSchema,
  LayoutSchema,
  VariableSchema,
  ActionSchema,
  BindingsSchema,
  EventHandlersSchema,
  TextComponentSchema,
  ButtonComponentSchema,
  ImageComponentSchema,
  DividerComponentSchema,
  ShapeComponentSchema,
  ToggleComponentSchema,
  IconComponentSchema,
  TextInputComponentSchema,
  ListItemSchema,
  ListComponentSchema,
  ContainerComponentSchema,
  ComponentSchema,
  ScreenSchema,
  ThemeSchema,
  AppSlateSchema,
} from "@shared/schema";

import type { TextComponent, ButtonComponent, IconComponent } from "@shared/schema";

export interface SlateMeta {
  id: string;
  name: string;
  createdAt: number;
  syncStatus?: 'synced' | 'dirty' | 'conflict' | 'local-only';
  remoteVersion?: number;
  lastSyncedAt?: number;
  updatedAt?: number;
}

export interface ShareInfo {
  shareCode: string;
  role: 'viewer' | 'editor';
  isActive: boolean;
  expiresAt?: number;
}

export type TextStyleUpdates = Partial<Pick<TextComponent, "fontSize" | "color" | "backgroundColor" | "fontFamily" | "fontWeight" | "textAlign" | "wrapMode" | "letterSpacing" | "lineHeight" | "textTransform" | "opacity">>;
export type ButtonStyleUpdates = Partial<Pick<ButtonComponent, "label" | "textColor" | "backgroundColor" | "fontSize" | "fontFamily" | "fontWeight" | "textAlign" | "borderColor" | "borderWidth" | "paddingHorizontal" | "paddingVertical" | "opacity">>;
export type IconStyleUpdates = Partial<Pick<IconComponent, "name" | "library" | "size" | "color">>;
export type BorderStyleUpdates = {
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  src?: string;
  layoutMode?: "absolute" | "flex";
  flexDirection?: "row" | "column";
  gap?: number;
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  paddingHorizontal?: number;
  paddingVertical?: number;
  opacity?: number;
  // Scroll
  scrollable?: boolean;
  scrollDirection?: "vertical" | "horizontal";
  // Shadow
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  // Gradient
  gradientEnabled?: boolean;
  gradientColors?: string[];
  gradientDirection?: "to-bottom" | "to-right" | "to-bottom-right" | "to-top";
};
export type ComponentStyleUpdates = TextStyleUpdates | ButtonStyleUpdates | IconStyleUpdates | BorderStyleUpdates;
