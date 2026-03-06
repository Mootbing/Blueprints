import React, { useRef } from "react";
import { View, StyleSheet, Animated, PanResponder } from "react-native";
import { Feather } from "@expo/vector-icons";

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
}

const THRESHOLD = -80;

export function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const deleteOpacity = translateX.interpolate({
    inputRange: [-300, -1, 0],
    outputRange: [1, 1, 0],
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx > 0 ? 0 : g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -300,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDelete());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <Feather name="trash-2" size={16} color="#fff" />
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 20,
  },
});
