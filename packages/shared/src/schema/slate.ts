import { z } from "zod";

// --- Primitives ---

// Lenient: accept any finite number from the AI; the renderer clamps to 0-1
export const NormalizedFloat = z.number().finite();
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

const OpenAgentActionSchema = z.object({
  type: z.literal("OPEN_AGENT"),
  promptVariable: z.string(),
});

const RunCodeActionSchema = z.object({
  type: z.literal("RUN_CODE"),
  code: z.string(),
});

export const ActionSchema: z.ZodType<Action> = z.lazy(() =>
  z.union([
    SetVariableActionSchema,
    ToggleVariableActionSchema,
    NavigateActionSchema,
    OpenUrlActionSchema,
    ResetCanvasActionSchema,
    OpenAgentActionSchema,
    RunCodeActionSchema,
    z.object({
      type: z.literal("FETCH"),
      url: z.string(),
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.string().optional(),
      resultVariable: z.string(),
      errorVariable: z.string().optional(),
      onSuccess: z.array(z.lazy(() => ActionSchema)).optional(),
      onError: z.array(z.lazy(() => ActionSchema)).optional(),
    }),
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
export type OpenAgentAction = z.infer<typeof OpenAgentActionSchema>;
export type RunCodeAction = z.infer<typeof RunCodeActionSchema>;
export type FetchAction = {
  type: "FETCH";
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  resultVariable: string;
  errorVariable?: string;
  onSuccess?: Action[];
  onError?: Action[];
};
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
  | OpenAgentAction
  | FetchAction
  | RunCodeAction
  | ConditionalAction;

// --- Bindings & Event Handlers ---

export const BindingsSchema = z.record(z.string(), z.string()).optional();
export type Bindings = z.infer<typeof BindingsSchema>;

const EventNameEnum = z.enum(["onTap", "onLongPress", "onChange", "onSubmit", "onItemTap", "onLeftTap", "onRightTap"]);
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
  items: z.array(ListItemSchema).optional(),
  itemsSource: z.string().optional(),
  itemTitleKey: z.string().optional(),
  itemSubtitleKey: z.string().optional(),
  itemImageKey: z.string().optional(),
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

// --- Phase 1: Structural Components ---

export const CardComponentSchema = z.object({
  type: z.literal("card"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().optional(),
  imagePosition: z.enum(["top", "left", "background"]).optional(),
  footerLabel: z.string().optional(),
  backgroundColor: z.string().min(1).optional(),
  titleColor: z.string().min(1).optional(),
  subtitleColor: z.string().min(1).optional(),
  bodyColor: z.string().min(1).optional(),
  footerColor: z.string().min(1).optional(),
  borderRadius: z.number().min(0).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().min(1).optional(),
  shadowOpacity: z.number().min(0).max(1).optional(),
  shadowRadius: z.number().min(0).optional(),
  imageHeight: z.number().optional(),
  titleFontSize: z.number().positive().optional(),
  subtitleFontSize: z.number().positive().optional(),
  bodyFontSize: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),
  ...runtimeFields,
});
export type CardComponent = z.infer<typeof CardComponentSchema>;

const IconLibraryEnum = z.enum(["material", "feather", "ionicons"]);

export const AppBarComponentSchema = z.object({
  type: z.literal("appBar"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  title: z.string(),
  leftIcon: z.string().optional(),
  rightIcon: z.string().optional(),
  iconLibrary: IconLibraryEnum.optional(),
  backgroundColor: z.string().min(1).optional(),
  titleColor: z.string().min(1).optional(),
  iconColor: z.string().min(1).optional(),
  titleFontSize: z.number().positive().optional(),
  titleFontWeight: FontWeightEnum.optional(),
  borderBottom: z.boolean().optional(),
  borderColor: z.string().min(1).optional(),
  ...runtimeFields,
});
export type AppBarComponent = z.infer<typeof AppBarComponentSchema>;

export const TabBarTabSchema = z.object({
  label: z.string(),
  icon: z.string(),
  iconLibrary: IconLibraryEnum.optional(),
  screenId: z.string().uuid().optional(),
});
export type TabBarTab = z.infer<typeof TabBarTabSchema>;

export const TabBarComponentSchema = z.object({
  type: z.literal("tabBar"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  tabs: z.array(TabBarTabSchema),
  activeIndex: z.number().int().min(0).optional(),
  activeColor: z.string().min(1).optional(),
  inactiveColor: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  borderTop: z.boolean().optional(),
  borderColor: z.string().min(1).optional(),
  showLabels: z.boolean().optional(),
  ...runtimeFields,
});
export type TabBarComponent = z.infer<typeof TabBarComponentSchema>;

// --- Phase 2: Form Input Components ---

export const CheckboxComponentSchema = z.object({
  type: z.literal("checkbox"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  label: z.string().optional(),
  checked: z.boolean().optional(),
  activeColor: z.string().min(1).optional(),
  inactiveColor: z.string().min(1).optional(),
  checkColor: z.string().min(1).optional(),
  labelColor: z.string().min(1).optional(),
  labelFontSize: z.number().positive().optional(),
  size: z.number().positive().optional(),
  labelPosition: z.enum(["left", "right"]).optional(),
  borderRadius: z.number().min(0).optional(),
  ...runtimeFields,
});
export type CheckboxComponent = z.infer<typeof CheckboxComponentSchema>;

export const SearchBarComponentSchema = z.object({
  type: z.literal("searchBar"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  placeholder: z.string().optional(),
  value: z.string().optional(),
  backgroundColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  textColor: z.string().min(1).optional(),
  placeholderColor: z.string().min(1).optional(),
  iconColor: z.string().min(1).optional(),
  fontSize: z.number().positive().optional(),
  showClearButton: z.boolean().optional(),
  ...runtimeFields,
});
export type SearchBarComponent = z.infer<typeof SearchBarComponentSchema>;

export const SliderComponentSchema = z.object({
  type: z.literal("slider"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  value: z.number().optional(),
  trackColor: z.string().min(1).optional(),
  activeTrackColor: z.string().min(1).optional(),
  thumbColor: z.string().min(1).optional(),
  showValue: z.boolean().optional(),
  valueColor: z.string().min(1).optional(),
  ...runtimeFields,
});
export type SliderComponent = z.infer<typeof SliderComponentSchema>;

export const SelectOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const SelectComponentSchema = z.object({
  type: z.literal("select"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  options: z.array(SelectOptionSchema).optional(),
  optionsSource: z.string().optional(),
  optionLabelKey: z.string().optional(),
  optionValueKey: z.string().optional(),
  placeholder: z.string().optional(),
  selectedValue: z.string().optional(),
  backgroundColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  textColor: z.string().min(1).optional(),
  placeholderColor: z.string().min(1).optional(),
  iconColor: z.string().min(1).optional(),
  fontSize: z.number().positive().optional(),
  ...runtimeFields,
});
export type SelectComponent = z.infer<typeof SelectComponentSchema>;

// --- Phase 3: Visual Polish Components ---

export const BadgeComponentSchema = z.object({
  type: z.literal("badge"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  text: z.string(),
  backgroundColor: z.string().min(1).optional(),
  textColor: z.string().min(1).optional(),
  fontSize: z.number().positive().optional(),
  borderRadius: z.number().min(0).optional(),
  paddingHorizontal: z.number().min(0).optional(),
  paddingVertical: z.number().min(0).optional(),
  ...runtimeFields,
});
export type BadgeComponent = z.infer<typeof BadgeComponentSchema>;

export const AvatarComponentSchema = z.object({
  type: z.literal("avatar"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  src: z.string().optional(),
  initials: z.string().optional(),
  size: z.number().positive().optional(),
  backgroundColor: z.string().min(1).optional(),
  textColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  fontSize: z.number().positive().optional(),
  ...runtimeFields,
});
export type AvatarComponent = z.infer<typeof AvatarComponentSchema>;

export const ProgressBarComponentSchema = z.object({
  type: z.literal("progressBar"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  value: z.number().optional(),
  trackColor: z.string().min(1).optional(),
  fillColor: z.string().min(1).optional(),
  height: z.number().positive().optional(),
  borderRadius: z.number().min(0).optional(),
  animated: z.boolean().optional(),
  ...runtimeFields,
});
export type ProgressBarComponent = z.infer<typeof ProgressBarComponentSchema>;

export const ChipComponentSchema = z.object({
  type: z.literal("chip"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  label: z.string(),
  selected: z.boolean().optional(),
  selectedColor: z.string().min(1).optional(),
  unselectedColor: z.string().min(1).optional(),
  selectedTextColor: z.string().min(1).optional(),
  unselectedTextColor: z.string().min(1).optional(),
  icon: z.string().optional(),
  iconLibrary: IconLibraryEnum.optional(),
  borderRadius: z.number().min(0).optional(),
  fontSize: z.number().positive().optional(),
  ...runtimeFields,
});
export type ChipComponent = z.infer<typeof ChipComponentSchema>;

export const SegmentedControlOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const SegmentedControlComponentSchema = z.object({
  type: z.literal("segmentedControl"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  options: z.array(SegmentedControlOptionSchema),
  selectedValue: z.string().optional(),
  activeColor: z.string().min(1).optional(),
  inactiveColor: z.string().min(1).optional(),
  activeTextColor: z.string().min(1).optional(),
  inactiveTextColor: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  borderRadius: z.number().min(0).optional(),
  fontSize: z.number().positive().optional(),
  ...runtimeFields,
});
export type SegmentedControlComponent = z.infer<typeof SegmentedControlComponentSchema>;

// --- Phase 4: Advanced Components ---

export const CarouselItemSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});
export type CarouselItem = z.infer<typeof CarouselItemSchema>;

export const CarouselComponentSchema = z.object({
  type: z.literal("carousel"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  items: z.array(CarouselItemSchema).optional(),
  itemsSource: z.string().optional(),
  itemImageKey: z.string().optional(),
  itemTitleKey: z.string().optional(),
  itemSubtitleKey: z.string().optional(),
  autoPlay: z.boolean().optional(),
  interval: z.number().positive().optional(),
  showDots: z.boolean().optional(),
  dotColor: z.string().min(1).optional(),
  activeDotColor: z.string().min(1).optional(),
  borderRadius: z.number().min(0).optional(),
  titleColor: z.string().min(1).optional(),
  subtitleColor: z.string().min(1).optional(),
  ...runtimeFields,
});
export type CarouselComponent = z.infer<typeof CarouselComponentSchema>;

// Base discriminated union (without container/accordion/bottomSheet, which need z.lazy)
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
  // Phase 1: Structural
  CardComponentSchema,
  AppBarComponentSchema,
  TabBarComponentSchema,
  // Phase 2: Form Inputs
  CheckboxComponentSchema,
  SearchBarComponentSchema,
  SliderComponentSchema,
  SelectComponentSchema,
  // Phase 3: Visual Polish
  BadgeComponentSchema,
  AvatarComponentSchema,
  ProgressBarComponentSchema,
  ChipComponentSchema,
  SegmentedControlComponentSchema,
  // Phase 4: Advanced
  CarouselComponentSchema,
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

export interface AccordionComponent {
  type: "accordion";
  id: string;
  layout: Layout;
  title: string;
  expanded?: boolean;
  titleColor?: string;
  titleFontSize?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  iconColor?: string;
  children?: Component[];
  bindings?: Record<string, string>;
  actions?: Record<string, Action[]>;
  visibleWhen?: string;
}

export interface BottomSheetComponent {
  type: "bottomSheet";
  id: string;
  layout: Layout;
  height?: number;
  backgroundColor?: string;
  handleColor?: string;
  borderRadius?: number;
  backdropColor?: string;
  backdropOpacity?: number;
  children?: Component[];
  bindings?: Record<string, string>;
  actions?: Record<string, Action[]>;
  visibleWhen?: string;
}

export type Component = BaseComponent | ContainerComponent | AccordionComponent | BottomSheetComponent;

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

export const AccordionComponentSchema: z.ZodType<AccordionComponent> = z.object({
  type: z.literal("accordion"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  title: z.string(),
  expanded: z.boolean().optional(),
  titleColor: z.string().min(1).optional(),
  titleFontSize: z.number().positive().optional(),
  backgroundColor: z.string().min(1).optional(),
  borderColor: z.string().min(1).optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  iconColor: z.string().min(1).optional(),
  children: z.lazy(() => z.array(ComponentSchema)).optional(),
  ...runtimeFields,
});

export const BottomSheetComponentSchema: z.ZodType<BottomSheetComponent> = z.object({
  type: z.literal("bottomSheet"),
  id: z.string().uuid(),
  layout: LayoutSchema,
  height: z.number().min(0).max(1).optional(),
  backgroundColor: z.string().min(1).optional(),
  handleColor: z.string().min(1).optional(),
  borderRadius: z.number().min(0).optional(),
  backdropColor: z.string().min(1).optional(),
  backdropOpacity: z.number().min(0).max(1).optional(),
  children: z.lazy(() => z.array(ComponentSchema)).optional(),
  ...runtimeFields,
});

export const ComponentSchema: z.ZodType<Component> = z.union([BaseComponentSchema, ContainerComponentSchema, AccordionComponentSchema, BottomSheetComponentSchema]);

// --- Workflows ---

export const WorkflowBlockSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});
export type WorkflowBlock = z.infer<typeof WorkflowBlockSchema>;

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  blocks: z.array(WorkflowBlockSchema),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

// --- Screen & App ---

export const ScreenSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  components: z.array(ComponentSchema),
  variables: z.array(VariableSchema).optional(),
  workflows: z.array(WorkflowSchema).optional(),
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
