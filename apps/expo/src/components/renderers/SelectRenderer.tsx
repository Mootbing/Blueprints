import React, { useState, useMemo } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SelectComponent } from "../../types";
import { useRuntimeStore } from "../../runtime/useRuntimeStore";

export interface SelectRendererProps {
  component: SelectComponent;
  isEditMode?: boolean;
}

export const SelectRenderer = React.memo(function SelectRenderer({ component, isEditMode }: SelectRendererProps) {
  const [selectedValue, setSelectedValue] = useState(component.selectedValue ?? "");
  const [modalVisible, setModalVisible] = useState(false);

  const variables = useRuntimeStore((s) => s.variables);

  const backgroundColor = component.backgroundColor ?? "#1a1a1a";
  const borderColor = component.borderColor ?? "#333333";
  const borderWidth = component.borderWidth ?? 1;
  const borderRadius = component.borderRadius ?? 8;
  const textColor = component.textColor ?? "#ffffff";
  const placeholderColor = component.placeholderColor ?? "#666666";
  const iconColor = component.iconColor ?? "#666666";
  const fontSize = component.fontSize ?? 16;
  const placeholder = component.placeholder ?? "Select...";

  const options = useMemo(() => {
    if (component.optionsSource) {
      const source = variables[component.optionsSource];
      if (Array.isArray(source)) {
        const labelKey = component.optionLabelKey ?? "label";
        const valueKey = component.optionValueKey ?? "value";
        return source.map((item: any) => ({
          label: String(item[labelKey] ?? ""),
          value: String(item[valueKey] ?? ""),
        }));
      }
    }
    return component.options ?? [];
  }, [component.options, component.optionsSource, component.optionLabelKey, component.optionValueKey, variables]);

  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayLabel = selectedOption?.label ?? "";

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
      }}
    >
      <Pressable
        onPress={() => {
          if (!isEditMode) setModalVisible(true);
        }}
        disabled={isEditMode}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize,
            color: displayLabel ? textColor : placeholderColor,
          }}
          numberOfLines={1}
        >
          {displayLabel || placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={iconColor} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: "#f5f5f5",
              borderRadius: 12,
              width: "80%",
              maxHeight: "60%",
              paddingVertical: 8,
            }}
            onPress={() => {
              // Prevent closing when tapping inside the card
            }}
          >
            <ScrollView>
              {options.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setSelectedValue(option.value);
                      setModalVisible(false);
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: isSelected ? "#e0e0e0" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#222222",
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});
