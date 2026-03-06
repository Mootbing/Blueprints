import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

interface GradientOverlayProps {
  colors: string[];
  direction?: "to-bottom" | "to-right" | "to-bottom-right" | "to-top";
  borderRadius?: number;
}

function directionToCoords(dir: string) {
  switch (dir) {
    case "to-right":
      return { x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
    case "to-bottom-right":
      return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
    case "to-top":
      return { x1: "0%", y1: "100%", x2: "0%", y2: "0%" };
    case "to-bottom":
    default:
      return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
  }
}

export const GradientOverlay = React.memo(function GradientOverlay({
  colors,
  direction = "to-bottom",
  borderRadius = 0,
}: GradientOverlayProps) {
  const coords = directionToCoords(direction);

  return (
    <Svg
      style={[StyleSheet.absoluteFill, { borderRadius }]}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="grad" {...coords}>
          {colors.map((color, i) => (
            <Stop
              key={i}
              offset={`${(i / (colors.length - 1)) * 100}%`}
              stopColor={color}
              stopOpacity="1"
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" rx={borderRadius} ry={borderRadius} />
    </Svg>
  );
});
