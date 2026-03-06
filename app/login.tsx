import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }

    router.replace("/setup");
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <Text style={styles.h1}>Log in</Text>

      <View style={styles.form}>
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
      </View>

      <Button
        style={styles.loginBut}
        title={loading ? "Logging in…" : "Log in"}
        onPress={handleLogin}
        disabled={loading}
      />

      <View style={styles.row}>
        <Text style={styles.muted}>Don't have an account? </Text>
        <Pressable onPress={() => router.push("/create-account")}>
          <Text style={styles.link}>Create account</Text>
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
  loginBut: { marginTop: 15 },
  row: { flexDirection: "row", marginTop: 12, justifyContent: "center", alignContent: "center" },
  muted: { color: "#6B7280" },
  link: { color: "#6EA31C", fontWeight: "700" },
});
