import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

export default function Button({
  title,
  onPress,
  style,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: "primary" | "pill";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "pill" && styles.pill,
        disabled && styles.disabled,
        pressed && !disabled && { opacity: 0.9 },
        style,
      ]}
    >
      <Text style={[styles.text, variant === "pill" && styles.pillText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#70ab25",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  text: {
    color: "white",
    fontWeight: "800",
    fontSize: 18,
  },
  pill: {
    borderRadius: 50,
    paddingHorizontal: 30,
    paddingVertical: 10,
    alignSelf: "center",
  },
  pillText: {
    fontSize: 24,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
});
