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
        placeholderTextColor="#999"
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
    borderColor: "#000",
    borderRadius: 8,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 18,
    fontWeight: "500",
    color: "#000",
  },
});
