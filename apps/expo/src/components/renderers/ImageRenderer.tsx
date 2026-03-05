import React from "react";
import { Image } from "react-native";
import type { ImageComponent } from "../../types";

export interface ImageRendererProps {
  component: ImageComponent;
}

export function ImageRenderer({ component }: ImageRendererProps) {
  return (
    <Image
      source={{ uri: component.src }}
      resizeMode={component.resizeMode ?? "cover"}
      style={{ flex: 1, width: "100%", height: "100%" }}
    />
  );
}
