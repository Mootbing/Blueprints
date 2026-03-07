import type { ComponentType } from "react";
import { TextRenderer } from "./TextRenderer";
import type { TextRendererProps } from "./TextRenderer";
import { ButtonRenderer } from "./ButtonRenderer";
import type { ButtonRendererProps } from "./ButtonRenderer";
import { ImageRenderer } from "./ImageRenderer";
import type { ImageRendererProps } from "./ImageRenderer";
import { DividerRenderer } from "./DividerRenderer";
import type { DividerRendererProps } from "./DividerRenderer";
import { ShapeRenderer } from "./ShapeRenderer";
import type { ShapeRendererProps } from "./ShapeRenderer";
import { ToggleRenderer } from "./ToggleRenderer";
import type { ToggleRendererProps } from "./ToggleRenderer";
import { IconRenderer } from "./IconRenderer";
import type { IconRendererProps } from "./IconRenderer";
import { TextInputRenderer } from "./TextInputRenderer";
import type { TextInputRendererProps } from "./TextInputRenderer";
import { ListRenderer } from "./ListRenderer";
import type { ListRendererProps } from "./ListRenderer";
import { ContainerRenderer } from "./ContainerRenderer";
import type { ContainerRendererProps } from "./ContainerRenderer";
// Compound components
import { CardRenderer } from "./CardRenderer";
import type { CardRendererProps } from "./CardRenderer";
import { AppBarRenderer } from "./AppBarRenderer";
import type { AppBarRendererProps } from "./AppBarRenderer";
import { TabBarRenderer } from "./TabBarRenderer";
import type { TabBarRendererProps } from "./TabBarRenderer";
import { CheckboxRenderer } from "./CheckboxRenderer";
import type { CheckboxRendererProps } from "./CheckboxRenderer";
import { SearchBarRenderer } from "./SearchBarRenderer";
import type { SearchBarRendererProps } from "./SearchBarRenderer";
import { SliderRenderer } from "./SliderRenderer";
import type { SliderRendererProps } from "./SliderRenderer";
import { SelectRenderer } from "./SelectRenderer";
import type { SelectRendererProps } from "./SelectRenderer";
import { BadgeRenderer } from "./BadgeRenderer";
import type { BadgeRendererProps } from "./BadgeRenderer";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarRendererProps } from "./AvatarRenderer";
import { ProgressBarRenderer } from "./ProgressBarRenderer";
import type { ProgressBarRendererProps } from "./ProgressBarRenderer";
import { ChipRenderer } from "./ChipRenderer";
import type { ChipRendererProps } from "./ChipRenderer";
import { SegmentedControlRenderer } from "./SegmentedControlRenderer";
import type { SegmentedControlRendererProps } from "./SegmentedControlRenderer";
import { CarouselRenderer } from "./CarouselRenderer";
import type { CarouselRendererProps } from "./CarouselRenderer";
import { AccordionRenderer } from "./AccordionRenderer";
import type { AccordionRendererProps } from "./AccordionRenderer";
import { BottomSheetRenderer } from "./BottomSheetRenderer";
import type { BottomSheetRendererProps } from "./BottomSheetRenderer";

export type AnyRendererProps =
  | TextRendererProps
  | ButtonRendererProps
  | ImageRendererProps
  | DividerRendererProps
  | ShapeRendererProps
  | ToggleRendererProps
  | IconRendererProps
  | TextInputRendererProps
  | ListRendererProps
  | ContainerRendererProps
  | CardRendererProps
  | AppBarRendererProps
  | TabBarRendererProps
  | CheckboxRendererProps
  | SearchBarRendererProps
  | SliderRendererProps
  | SelectRendererProps
  | BadgeRendererProps
  | AvatarRendererProps
  | ProgressBarRendererProps
  | ChipRendererProps
  | SegmentedControlRendererProps
  | CarouselRendererProps
  | AccordionRendererProps
  | BottomSheetRendererProps;

export const rendererRegistry: Record<string, ComponentType<any>> = {
  text: TextRenderer,
  button: ButtonRenderer,
  image: ImageRenderer,
  divider: DividerRenderer,
  shape: ShapeRenderer,
  toggle: ToggleRenderer,
  icon: IconRenderer,
  textInput: TextInputRenderer,
  list: ListRenderer,
  container: ContainerRenderer,
  // Compound components
  card: CardRenderer,
  appBar: AppBarRenderer,
  tabBar: TabBarRenderer,
  checkbox: CheckboxRenderer,
  searchBar: SearchBarRenderer,
  slider: SliderRenderer,
  select: SelectRenderer,
  badge: BadgeRenderer,
  avatar: AvatarRenderer,
  progressBar: ProgressBarRenderer,
  chip: ChipRenderer,
  segmentedControl: SegmentedControlRenderer,
  carousel: CarouselRenderer,
  accordion: AccordionRenderer,
  bottomSheet: BottomSheetRenderer,
};

export {
  TextRenderer,
  ButtonRenderer,
  ImageRenderer,
  DividerRenderer,
  ShapeRenderer,
  ToggleRenderer,
  IconRenderer,
  TextInputRenderer,
  ListRenderer,
  ContainerRenderer,
  CardRenderer,
  AppBarRenderer,
  TabBarRenderer,
  CheckboxRenderer,
  SearchBarRenderer,
  SliderRenderer,
  SelectRenderer,
  BadgeRenderer,
  AvatarRenderer,
  ProgressBarRenderer,
  ChipRenderer,
  SegmentedControlRenderer,
  CarouselRenderer,
  AccordionRenderer,
  BottomSheetRenderer,
};
export type {
  TextRendererProps,
  ButtonRendererProps,
  ImageRendererProps,
  DividerRendererProps,
  ShapeRendererProps,
  ToggleRendererProps,
  IconRendererProps,
  TextInputRendererProps,
  ListRendererProps,
  ContainerRendererProps,
  CardRendererProps,
  AppBarRendererProps,
  TabBarRendererProps,
  CheckboxRendererProps,
  SearchBarRendererProps,
  SliderRendererProps,
  SelectRendererProps,
  BadgeRendererProps,
  AvatarRendererProps,
  ProgressBarRendererProps,
  ChipRendererProps,
  SegmentedControlRendererProps,
  CarouselRendererProps,
  AccordionRendererProps,
  BottomSheetRendererProps,
};
