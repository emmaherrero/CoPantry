import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";

export default function CreateAccount() {
  return (
    <View style={styles.container}>

      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <Text style={styles.h1}>Create account</Text>

      <View style={styles.form}>
        <Input placeholder="Full name" autoCapitalize="words" />
        <Input placeholder="Email address" keyboardType="email-address" />
        <Input placeholder="Password" secureTextEntry />
        <Input placeholder="Confirm password" secureTextEntry />
      </View>

      <Button title="Create account" onPress={() => router.push("/setup")} />

      <View style={styles.row}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 60, paddingHorizontal: 22 },
  back: { width: 44, height: 44, justifyContent: "center" },
  backText: { fontSize: 30, marginTop: -6 },
  h1: {fontSize: 35, fontWeight: "700", marginTop: 16 },
  form: { gap: 15, marginTop: 50 },
  row: { flexDirection: "row", marginTop: 12, justifyContent: "center", alignContent: "center" },
  muted: { color: "#6B7280"},
  link: { color: "#6EA31C", fontWeight: "700" },
});