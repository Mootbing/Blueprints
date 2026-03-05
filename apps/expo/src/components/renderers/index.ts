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
  | ContainerRendererProps;

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
};
