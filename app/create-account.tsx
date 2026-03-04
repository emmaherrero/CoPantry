import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";

export default function CreateAccount() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }

    router.replace("/setup");
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <Text style={styles.h1}>Create account</Text>

      <View style={styles.form}>
        <Input
          placeholder="Full name"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />
        <Input
          placeholder="Email address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Input
          placeholder="Confirm password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>

      <Button
        title={loading ? "Creating account…" : "Create account"}
        onPress={handleSignUp}
        disabled={loading}
      />

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
  h1: { fontSize: 35, fontWeight: "700", marginTop: 16 },
  form: { gap: 15, marginTop: 50 },
  row: { flexDirection: "row", marginTop: 12, justifyContent: "center", alignContent: "center" },
  muted: { color: "#6B7280" },
  link: { color: "#6EA31C", fontWeight: "700" },
});
