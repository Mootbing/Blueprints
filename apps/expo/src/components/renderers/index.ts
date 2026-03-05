import type { ComponentType } from "react";
import { TextRenderer } from "./TextRenderer";
import { ButtonRenderer } from "./ButtonRenderer";
import { ImageRenderer } from "./ImageRenderer";

export const rendererRegistry: Record<string, ComponentType<any>> = {
  text: TextRenderer,
  button: ButtonRenderer,
  image: ImageRenderer,
};

export { TextRenderer, ButtonRenderer, ImageRenderer };
