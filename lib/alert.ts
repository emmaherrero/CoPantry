import { Alert, Platform } from "react-native";

export function showAlert(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
  } else {
    Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = "OK",
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: confirmText, style: "destructive", onPress: onConfirm },
    ]);
  }
}
