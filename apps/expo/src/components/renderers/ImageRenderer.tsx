import React, { useState } from "react";
import { Image, View, Text, Pressable } from "react-native";
import type { ImageComponent } from "../../types";

export interface ImageRendererProps {
  component: ImageComponent;
  onPickImage?: () => void;
}

export const ImageRenderer = React.memo(function ImageRenderer({ component, onPickImage }: ImageRendererProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Pressable
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          borderRadius: component.borderRadius ?? 0,
          backgroundColor: "#111",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onPickImage}
        disabled={!onPickImage}
      >
        <Text style={{ color: "#555", fontSize: 12 }}>
          {onPickImage ? "Tap to choose image" : "Image failed to load"}
        </Text>
      </Pressable>
    );
  }

  if (onPickImage) {
    return (
      <Pressable
        style={{ flex: 1, width: "100%", height: "100%" }}
        onPress={onPickImage}
      >
        <Image
          source={{ uri: component.src }}
          resizeMode={component.resizeMode ?? "cover"}
          style={{ flex: 1, width: "100%", height: "100%", borderRadius: component.borderRadius ?? 0 }}
          onError={() => setHasError(true)}
        />
        <View style={{
          position: "absolute",
          bottom: 8,
          alignSelf: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
        }}>
          <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>Tap to change image</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Image
      source={{ uri: component.src }}
      resizeMode={component.resizeMode ?? "cover"}
      style={{ flex: 1, width: "100%", height: "100%", borderRadius: component.borderRadius ?? 0 }}
      onError={() => setHasError(true)}
    />
  );
});
