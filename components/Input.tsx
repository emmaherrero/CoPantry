import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { AppTheme, Fonts } from "../constants/theme";

export default function Input({
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  value,
  onChangeText,
}: {
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  value?: string;
  onChangeText?: (text: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={AppTheme.colors.muted}
        style={styles.input}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.surface,
    shadowColor: "#c9b3a6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 18,
    fontFamily: Fonts.rounded,
    fontWeight: "500",
    color: AppTheme.colors.text,
  },
});
