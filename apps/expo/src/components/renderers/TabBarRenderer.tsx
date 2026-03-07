import React, { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { TabBarComponent } from "../../types";
import { useRuntimeStore } from "../../runtime/useRuntimeStore";
import { executeActions } from "../../runtime/executeActions";

export interface TabBarRendererProps {
  component: TabBarComponent;
  isEditMode?: boolean;
  onNavigate?: (screenId: string) => void;
  onResetAndBuild?: () => void;
}

export const TabBarRenderer = React.memo(function TabBarRenderer({
  component,
  isEditMode,
  onNavigate,
  onResetAndBuild,
}: TabBarRendererProps) {
  const variables = useRuntimeStore((s) => s.variables);
  const store = useRuntimeStore();

  const [localActiveIndex, setLocalActiveIndex] = useState(
    component.activeIndex ?? 0,
  );

  // If a binding exists for activeIndex, prefer the runtime variable value
  const boundActiveIndexKey = component.bindings?.activeIndex;
  const activeIndex =
    boundActiveIndexKey != null && variables[boundActiveIndexKey] != null
      ? Number(variables[boundActiveIndexKey])
      : localActiveIndex;

  const activeColor = component.activeColor ?? "#ffffff";
  const inactiveColor = component.inactiveColor ?? "#666666";
  const backgroundColor = component.backgroundColor ?? "#000000";
  const borderColor = component.borderColor ?? "#1a1a1a";
  const showLabels = component.showLabels !== false;
  const tabs = component.tabs ?? [];

  const hasItemTap =
    !isEditMode &&
    component.actions?.onItemTap &&
    component.actions.onItemTap.length > 0;

  const handleTabPress = useCallback(
    async (index: number) => {
      if (isEditMode) return;

      // Update local state
      setLocalActiveIndex(index);

      // If bound variable, write via store
      if (boundActiveIndexKey) {
        store.setVariable(boundActiveIndexKey, index);
      }

      // Navigate if tab has a screenId
      const tab = tabs[index];
      if (tab?.screenId) {
        onNavigate?.(tab.screenId);
      }

      // Execute onItemTap actions if defined
      if (hasItemTap) {
        store.setVariable("_itemIndex", index);
        await executeActions(component.actions!.onItemTap!, store, {
          navigate: (id) => onNavigate?.(id),
          resetAndBuild: onResetAndBuild,
        });
      }
    },
    [
      isEditMode,
      boundActiveIndexKey,
      tabs,
      hasItemTap,
      store,
      component.actions,
      onNavigate,
      onResetAndBuild,
    ],
  );

  const renderIcon = (
    iconName: string,
    iconLibrary: string | undefined,
    color: string,
  ) => {
    const library = iconLibrary ?? "material";
    let IconComp: React.ElementType;
    switch (library) {
      case "feather":
        IconComp = Feather;
        break;
      case "ionicons":
        IconComp = Ionicons;
        break;
      default:
        IconComp = MaterialIcons;
        break;
    }
    // Icon libraries have incompatible name type unions; `as any` is unavoidable here
    return <IconComp name={iconName as any} size={24} color={color} />;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderTopWidth: component.borderTop ? 1 : 0,
        borderTopColor: borderColor,
        flexDirection: "row",
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const color = isActive ? activeColor : inactiveColor;

        const tabContent = (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
            }}
          >
            {renderIcon(tab.icon, tab.iconLibrary, color)}
            {showLabels && (
              <Text
                style={{
                  fontSize: 10,
                  marginTop: 2,
                  color,
                }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            )}
          </View>
        );

        if (isEditMode) {
          return (
            <View key={index} style={{ flex: 1 }}>
              {tabContent}
            </View>
          );
        }

        return (
          <Pressable
            key={index}
            style={{ flex: 1 }}
            onPress={() => handleTabPress(index)}
          >
            {tabContent}
          </Pressable>
        );
      })}
    </View>
  );
});
