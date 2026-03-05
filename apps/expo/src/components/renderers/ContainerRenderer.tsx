import React from "react";
import { View } from "react-native";
import type { ContainerComponent } from "../../types";

export interface ContainerRendererProps {
  component: ContainerComponent;
  isEditMode?: boolean;
  renderChild?: (child: any) => React.ReactNode;
}

export function ContainerRenderer({ component, renderChild }: ContainerRendererProps) {
  const backgroundColor = component.backgroundColor ?? "#ffffff";
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth ?? 0;
  const borderRadius = component.borderRadius ?? 12;
  const padding = (component.padding ?? 0) * 100;
  const shadowEnabled = component.shadowEnabled ?? false;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        borderWidth,
        borderColor: borderColor ?? "transparent",
        padding,
        ...(shadowEnabled
          ? {
              shadowColor: component.shadowColor ?? "#000000",
              shadowOpacity: component.shadowOpacity ?? 0.15,
              shadowRadius: component.shadowRadius ?? 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }
          : {}),
      }}
    >
      {component.children?.map((child) =>
        renderChild ? renderChild(child) : null
      )}
    </View>
  );
}
