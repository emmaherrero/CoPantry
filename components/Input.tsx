import React from "react";
import { StyleSheet, TextInput, View } from "react-native";

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
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  value?: string;
  onChangeText?: (text: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
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
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "white",
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
});