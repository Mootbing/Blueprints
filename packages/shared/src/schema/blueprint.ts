import { z } from "zod";

// --- Primitives ---

export const NormalizedFloat = z.number().min(0).max(1);
export type NormalizedFloat = z.infer<typeof NormalizedFloat>;

export const LayoutSchema = z.object({
  x: NormalizedFloat,
  y: NormalizedFloat,
  width: NormalizedFloat,
  height: NormalizedFloat,
});
export type Layout = z.infer<typeof LayoutSchema>;

// --- Interactions ---

const NavigateInteraction = z.object({
  trigger: z.literal("onTap"),
  action: z.literal("navigate"),
  target: z.string(),
});

const OpenUrlInteraction = z.object({
  trigger: z.literal("onTap"),
  action: z.literal("openUrl"),
  target: z.string(),
});

export const InteractionSchema = z.discriminatedUnion("action", [
  NavigateInteraction,
  OpenUrlInteraction,
]);
export type Interaction = z.infer<typeof InteractionSchema>;

// --- Components (discriminated union on `type`) ---

export const TextComponentSchema = z.object({
  type: z.literal("text"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  content: z.string(),
  fontSize: z.number().positive(),
  color: z.string(),
  fontWeight: z.string().optional(),
  backgroundColor: z.string().optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
});
export type TextComponent = z.infer<typeof TextComponentSchema>;

export const ButtonComponentSchema = z.object({
  type: z.literal("button"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  label: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  interactions: z.array(InteractionSchema).optional(),
});
export type ButtonComponent = z.infer<typeof ButtonComponentSchema>;

export const ImageComponentSchema = z.object({
  type: z.literal("image"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  src: z.string(),
  resizeMode: z.enum(["cover", "contain", "stretch", "center"]).optional(),
});
export type ImageComponent = z.infer<typeof ImageComponentSchema>;

export const ComponentSchema = z.discriminatedUnion("type", [
  TextComponentSchema,
  ButtonComponentSchema,
  ImageComponentSchema,
]);
export type Component = z.infer<typeof ComponentSchema>;

// --- Screen & App ---

export const ScreenSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  backgroundColor: z.string().optional(),
  components: z.array(ComponentSchema),
});
export type Screen = z.infer<typeof ScreenSchema>;

export const ThemeSchema = z.object({
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
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
