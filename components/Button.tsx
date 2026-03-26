import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { AppTheme, Fonts } from "../constants/theme";

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
        pressed && !disabled && styles.pressed,
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
    backgroundColor: AppTheme.colors.accent,
    paddingVertical: 16,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    ...AppTheme.shadow.floating,
  },
  text: {
    color: "#ffffff",
    fontFamily: Fonts.sans,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontSize: 17,
  },
  pill: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignSelf: "center",
  },
  pillText: {
    fontSize: 19,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
