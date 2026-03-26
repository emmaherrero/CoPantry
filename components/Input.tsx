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
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: "500",
    color: AppTheme.colors.text,
  },
});
