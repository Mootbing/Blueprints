export type {
  NormalizedFloat,
  Layout,
  Interaction,
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
  Screen,
  Theme,
  AppBlueprint,
} from "@shared/schema";

export {
  NormalizedFloat as NormalizedFloatSchema,
  LayoutSchema,
  InteractionSchema,
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
  AppBlueprintSchema,
} from "@shared/schema";

import type { TextComponent, ButtonComponent } from "@shared/schema";

export type TextStyleUpdates = Partial<Pick<TextComponent, "fontSize" | "color" | "backgroundColor" | "fontFamily" | "fontWeight" | "textAlign" | "wrapMode">>;
export type ButtonStyleUpdates = Partial<Pick<ButtonComponent, "label" | "textColor" | "backgroundColor" | "fontSize" | "fontFamily" | "fontWeight" | "textAlign">>;
export type BorderStyleUpdates = {
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  src?: string;
};
export type ComponentStyleUpdates = TextStyleUpdates | ButtonStyleUpdates | BorderStyleUpdates;
