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

// --- Interactions ---

const NavigateInteraction = z.object({
  trigger: z.literal("onTap"),
  action: z.literal("navigate"),
  target: z.string().uuid(),
});

const OpenUrlInteraction = z.object({
  trigger: z.literal("onTap"),
  action: z.literal("openUrl"),
  target: z.string().url(),
});

const ResetAndBuildInteraction = z.object({
  trigger: z.literal("onTap"),
  action: z.literal("resetAndBuild"),
  target: z.string(),
});

export const InteractionSchema = z.discriminatedUnion("action", [
  NavigateInteraction,
  OpenUrlInteraction,
  ResetAndBuildInteraction,
]);
export type Interaction = z.infer<typeof InteractionSchema>;

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
  interactions: z.array(InteractionSchema).optional(),
});
export type ButtonComponent = z.infer<typeof ButtonComponentSchema>;

export const ImageComponentSchema = z.object({
  type: z.literal("image"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  src: z.string(),
  resizeMode: z.enum(["cover", "contain", "stretch", "center"]).optional(),
  borderRadius: z.number().min(0).optional(),
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
  interactions: z.array(InteractionSchema).optional(),
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
});
export type TextInputComponent = z.infer<typeof TextInputComponentSchema>;

export const ListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
  interactions: z.array(InteractionSchema).optional(),
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
  children?: Component[];
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
  padding: NormalizedFloat.optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().min(1).optional(),
  shadowOpacity: z.number().min(0).max(1).optional(),
  shadowRadius: z.number().min(0).optional(),
  children: z.lazy(() => z.array(ComponentSchema)).optional(),
});

export const ComponentSchema: z.ZodType<Component> = z.union([BaseComponentSchema, ContainerComponentSchema]);

// --- Screen & App ---

export const ScreenSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  backgroundColor: z.string().min(1).optional(),
  components: z.array(ComponentSchema),
});
export type Screen = z.infer<typeof ScreenSchema>;

export const ThemeSchema = z.object({
  primaryColor: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  fontFamily: z.string().optional(),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const AppBlueprintSchema = z.object({
  version: z.literal(1),
  initial_screen_id: z.string().uuid(),
  theme: ThemeSchema.optional(),
  screens: z.record(z.string().uuid(), ScreenSchema),
});
export type AppBlueprint = z.infer<typeof AppBlueprintSchema>;
