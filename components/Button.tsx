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
    backgroundColor: AppTheme.colors.accent,
    paddingVertical: 16,
    borderRadius: AppTheme.radius.md,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#8d5066",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  text: {
    color: AppTheme.colors.text,
    fontFamily: Fonts.rounded,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontSize: 18,
  },
  pill: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 34,
    paddingVertical: 12,
    alignSelf: "center",
  },
  pillText: {
    fontSize: 24,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
