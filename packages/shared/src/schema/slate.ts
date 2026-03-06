import { z } from "zod";

// --- Primitives ---

export const NormalizedFloat = z.number().min(0).max(1);
export type NormalizedFloat = z.infer<typeof NormalizedFloat>;

export const LayoutSchema = z.object({
  x: NormalizedFloat,
  y: NormalizedFloat,
  width: NormalizedFloat,
  height: NormalizedFloat,
  rotation: z.number().finite().optional(),
});
export type Layout = z.infer<typeof LayoutSchema>;

// --- Variables ---

export const VariableSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  defaultValue: z.unknown(),
  persist: z.boolean().optional(),
});
export type Variable = z.infer<typeof VariableSchema>;

// --- Actions ---

const SetVariableActionSchema = z.object({
  type: z.literal("SET_VARIABLE"),
  key: z.string(),
  value: z.string(),
});

const ToggleVariableActionSchema = z.object({
  type: z.literal("TOGGLE_VARIABLE"),
  key: z.string(),
});

const NavigateActionSchema = z.object({
  type: z.literal("NAVIGATE"),
  target: z.string().uuid(),
});

const OpenUrlActionSchema = z.object({
  type: z.literal("OPEN_URL"),
  url: z.string(),
});

const ResetCanvasActionSchema = z.object({
  type: z.literal("RESET_CANVAS"),
});

export const ActionSchema: z.ZodType<Action> = z.lazy(() =>
  z.union([
    SetVariableActionSchema,
    ToggleVariableActionSchema,
    NavigateActionSchema,
    OpenUrlActionSchema,
    ResetCanvasActionSchema,
    ConditionalActionSchema,
  ])
);

const ConditionalActionSchema = z.object({
  type: z.literal("CONDITIONAL"),
  condition: z.string(),
  then: z.array(z.lazy(() => ActionSchema)),
  else: z.array(z.lazy(() => ActionSchema)).optional(),
});

export type SetVariableAction = z.infer<typeof SetVariableActionSchema>;
export type ToggleVariableAction = z.infer<typeof ToggleVariableActionSchema>;
export type NavigateAction = z.infer<typeof NavigateActionSchema>;
export type OpenUrlAction = z.infer<typeof OpenUrlActionSchema>;
export type ResetCanvasAction = z.infer<typeof ResetCanvasActionSchema>;
export type ConditionalAction = {
  type: "CONDITIONAL";
  condition: string;
  then: Action[];
  else?: Action[];
};
export type Action =
  | SetVariableAction
  | ToggleVariableAction
  | NavigateAction
  | OpenUrlAction
  | ResetCanvasAction
  | ConditionalAction;

// --- Bindings & Event Handlers ---

export const BindingsSchema = z.record(z.string(), z.string()).optional();
export type Bindings = z.infer<typeof BindingsSchema>;

const EventNameEnum = z.enum(["onTap", "onLongPress", "onChange", "onSubmit"]);
export const EventHandlersSchema = z.record(EventNameEnum, z.array(ActionSchema)).optional();
export type EventHandlers = z.infer<typeof EventHandlersSchema>;

// --- Shared runtime fields (added as optional to every component) ---

const runtimeFields = {
  bindings: BindingsSchema,
  actions: EventHandlersSchema,
  visibleWhen: z.string().optional(),
};

// --- Components (discriminated union on `type`) ---

const FontWeightEnum = z.enum(["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]);

export const TextComponentSchema = z.object({
  type: z.literal("text"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  content: z.string(),
  fontSize: z.number().positive(),
  color: z.string().min(1),
  fontWeight: FontWeightEnum.optional(),
  backgroundColor: z.string().min(1).optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  wrapMode: z.enum(["wrap-word", "wrap-text", "no-wrap"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().positive().optional(),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
  opacity: z.number().min(0).max(1).optional(),
  ...runtimeFields,
});
export type TextComponent = z.infer<typeof TextComponentSchema>;

export const FontWeightSchema = FontWeightEnum;
export type FontWeight = z.infer<typeof FontWeightSchema>;

export const ButtonComponentSchema = z.object({
  type: z.literal("button"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  label: z.string(),
  backgroundColor: z.string().min(1),
  textColor: z.string().min(1),
  fontSize: z.number().positive().optional(),
  fontFamily: z.string().optional(),
  fontWeight: FontWeightEnum.optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  borderRadius: z.number().min(0).optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().min(1).optional(),
  shadowOpacity: z.number().min(0).max(1).optional(),
  shadowRadius: z.number().min(0).optional(),
  gradientEnabled: z.boolean().optional(),
  gradientColors: z.array(z.string().min(1)).optional(),
  gradientDirection: z.enum(["to-bottom", "to-right", "to-bottom-right", "to-top"]).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  paddingHorizontal: z.number().min(0).optional(),
  paddingVertical: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  ...runtimeFields,
});
export type ButtonComponent = z.infer<typeof ButtonComponentSchema>;

export const ImageComponentSchema = z.object({
  type: z.literal("image"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  src: z.string(),
  resizeMode: z.enum(["cover", "contain", "stretch", "center"]).optional(),
  borderRadius: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  ...runtimeFields,
});
export type ImageComponent = z.infer<typeof ImageComponentSchema>;

export const DividerComponentSchema = z.object({
  type: z.literal("divider"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  direction: z.enum(["horizontal", "vertical"]).optional(),
  thickness: z.number().positive().optional(),
  color: z.string().min(1).optional(),
  lineStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
  ...runtimeFields,
});
export type DividerComponent = z.infer<typeof DividerComponentSchema>;

export const ShapeComponentSchema = z.object({
  type: z.literal("shape"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  shapeType: z.enum(["rectangle", "circle", "rounded-rectangle"]).optional(),
  backgroundColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().min(1).optional(),
  shadowOpacity: z.number().min(0).max(1).optional(),
  shadowRadius: z.number().min(0).optional(),
  gradientEnabled: z.boolean().optional(),
  gradientColors: z.array(z.string().min(1)).optional(),
  gradientDirection: z.enum(["to-bottom", "to-right", "to-bottom-right", "to-top"]).optional(),
  ...runtimeFields,
});
export type ShapeComponent = z.infer<typeof ShapeComponentSchema>;

export const ToggleComponentSchema = z.object({
  type: z.literal("toggle"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  label: z.string().optional(),
  defaultValue: z.boolean().optional(),
  activeColor: z.string().min(1).optional(),
  inactiveColor: z.string().min(1).optional(),
  thumbColor: z.string().min(1).optional(),
  labelColor: z.string().min(1).optional(),
  labelFontSize: z.number().positive().optional(),
  labelPosition: z.enum(["left", "right"]).optional(),
  ...runtimeFields,
});
export type ToggleComponent = z.infer<typeof ToggleComponentSchema>;

export const IconComponentSchema = z.object({
  type: z.literal("icon"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  name: z.string(),
  library: z.enum(["material", "feather", "ionicons"]).optional(),
  size: z.number().positive().optional(),
  color: z.string().min(1).optional(),
  opacity: z.number().min(0).max(1).optional(),
  ...runtimeFields,
});
export type IconComponent = z.infer<typeof IconComponentSchema>;

export const TextInputComponentSchema = z.object({
  type: z.literal("textInput"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().min(1).optional(),
  placeholderColor: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  keyboardType: z.enum(["default", "email", "numeric", "phone", "url"]).optional(),
  secure: z.boolean().optional(),
  fontFamily: z.string().optional(),
  boundVariable: z.string().optional(),
  ...runtimeFields,
});
export type TextInputComponent = z.infer<typeof TextInputComponentSchema>;

export const ListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
});
export type ListItem = z.infer<typeof ListItemSchema>;

export const ListComponentSchema = z.object({
  type: z.literal("list"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  items: z.array(ListItemSchema),
  itemHeight: z.number().positive().optional(),
  showDividers: z.boolean().optional(),
  dividerColor: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  titleColor: z.string().min(1).optional(),
  subtitleColor: z.string().min(1).optional(),
  titleFontSize: z.number().positive().optional(),
  subtitleFontSize: z.number().positive().optional(),
  showImages: z.boolean().optional(),
  imageShape: z.enum(["circle", "square", "rounded"]).optional(),
  borderRadius: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  ...runtimeFields,
});
export type ListComponent = z.infer<typeof ListComponentSchema>;

// Base discriminated union (without container, which needs z.lazy)
const BaseComponentSchema = z.discriminatedUnion("type", [
  TextComponentSchema,
  ButtonComponentSchema,
  ImageComponentSchema,
  DividerComponentSchema,
  ShapeComponentSchema,
  ToggleComponentSchema,
  IconComponentSchema,
  TextInputComponentSchema,
  ListComponentSchema,
]);

export type BaseComponent = z.infer<typeof BaseComponentSchema>;

export interface ContainerComponent {
  type: "container";
  id: string;
  layout: Layout;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  scrollable?: boolean;
  scrollDirection?: "vertical" | "horizontal";
  gradientEnabled?: boolean;
  gradientColors?: string[];
  gradientDirection?: "to-bottom" | "to-right" | "to-bottom-right" | "to-top";
  layoutMode?: "absolute" | "flex";
  flexDirection?: "row" | "column";
  gap?: number;
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  paddingHorizontal?: number;
  paddingVertical?: number;
  opacity?: number;
  children?: Component[];
  bindings?: Record<string, string>;
  actions?: Record<string, Action[]>;
  visibleWhen?: string;
}

export type Component = BaseComponent | ContainerComponent;

export const ContainerComponentSchema: z.ZodType<ContainerComponent> = z.object({
  type: z.literal("container"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  backgroundColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  padding: z.number().min(0).optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().min(1).optional(),
  shadowOpacity: z.number().min(0).max(1).optional(),
  shadowRadius: z.number().min(0).optional(),
  scrollable: z.boolean().optional(),
  scrollDirection: z.enum(["vertical", "horizontal"]).optional(),
  gradientEnabled: z.boolean().optional(),
  gradientColors: z.array(z.string().min(1)).optional(),
  gradientDirection: z.enum(["to-bottom", "to-right", "to-bottom-right", "to-top"]).optional(),
  layoutMode: z.enum(["absolute", "flex"]).optional(),
  flexDirection: z.enum(["row", "column"]).optional(),
  gap: z.number().min(0).optional(),
  justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]).optional(),
  alignItems: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
  flexWrap: z.enum(["nowrap", "wrap", "wrap-reverse"]).optional(),
  paddingHorizontal: z.number().min(0).optional(),
  paddingVertical: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  children: z.lazy(() => z.array(ComponentSchema)).optional(),
  ...runtimeFields,
});

export const ComponentSchema: z.ZodType<Component> = z.union([BaseComponentSchema, ContainerComponentSchema]);

// --- Screen & App ---

export const ScreenSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  components: z.array(ComponentSchema),
  variables: z.array(VariableSchema).optional(),
});
export type Screen = z.infer<typeof ScreenSchema>;

export const ThemeSchema = z.object({
  primaryColor: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  fontFamily: z.string().optional(),
  // Extended styling
  colors: z.object({
    primary: z.string().min(1),
    secondary: z.string().min(1),
    error: z.string().min(1),
    success: z.string().min(1),
    warning: z.string().min(1),
  }).optional(),
  backgroundColors: z.object({
    background: z.string().min(1),
    secondaryBackground: z.string().min(1),
  }).optional(),
  borderRadii: z.object({
    none: z.number(),
    sm: z.number(),
    md: z.number(),
    lg: z.number(),
    xl: z.number(),
    full: z.number(),
  }).optional(),
  spacing: z.object({
    xs: z.number(),
    sm: z.number(),
    md: z.number(),
    lg: z.number(),
    xl: z.number(),
    xxl: z.number(),
  }).optional(),
  fontSizes: z.object({
    xs: z.number(),
    sm: z.number(),
    base: z.number(),
    md: z.number(),
    lg: z.number(),
    xl: z.number(),
    xxl: z.number(),
  }).optional(),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const AppSlateSchema = z.object({
  version: z.literal(1),
  initial_screen_id: z.string().uuid(),
  theme: ThemeSchema.optional(),
  screens: z.record(z.string().uuid(), ScreenSchema),
  variables: z.array(VariableSchema).optional(),
});
export type AppSlate = z.infer<typeof AppSlateSchema>;
