import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { showAlert } from "../lib/alert";
import { AppTheme, Fonts } from "../constants/theme";

export default function CreateAccount() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirm) {
      showAlert("Missing fields", "Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      showAlert("Password mismatch", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      showAlert("Weak password", "Password must be at least 6 characters.");
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
      showAlert("Sign up failed", error.message);
      return;
    }

    router.replace("/setup");
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.arrow}>{"<"}</Text>
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
        title={loading ? "Creating account..." : "Create account"}
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
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.page,
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  back: { width: 44, height: 44, justifyContent: "center" },
  arrow: { fontSize: 24, fontWeight: "700", color: AppTheme.colors.text },
  h1: { fontSize: 41, fontWeight: "800", marginTop: 16, fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  form: { gap: 20, marginTop: 50 },
  row: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  muted: { color: AppTheme.colors.muted, fontSize: 18, fontFamily: Fonts.rounded },
  link: { color: AppTheme.colors.accentDark, fontWeight: "700", fontSize: 18, textDecorationLine: "underline", fontFamily: Fonts.rounded },
});
