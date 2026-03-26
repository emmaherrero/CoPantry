import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { showAlert } from "../lib/alert";
import { AppTheme, Fonts } from "../constants/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const canGoBack = router.canGoBack();

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Missing fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      showAlert("Login failed", error.message);
      return;
    }

    // Check if user has a household
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", data.user.id)
      .limit(1)
      .single();

    if (membership) {
      router.replace("/(tabs)/inventory" as any);
    } else {
      router.replace("/setup");
    }
  };

  return (
    <View style={styles.container}>
      {canGoBack ? (
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.arrow}>{"<"}</Text>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}

      <Text style={styles.h1}>Log in</Text>
      <Text style={styles.subhead}>
        Keep track of what is yours, what is shared, and what should be used soon.
      </Text>

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
        title={loading ? "Logging in..." : "Log in"}
        onPress={handleLogin}
        disabled={loading}
      />

      <View style={styles.row}>
        <Text style={styles.muted}>Don{"'"}t have an account? </Text>
        <Pressable onPress={() => router.push("/create-account")}>
          <Text style={styles.link}>Create account</Text>
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
  h1: { fontSize: 40, fontWeight: "800", marginTop: 16, fontFamily: Fonts.sans, color: AppTheme.colors.text, letterSpacing: -0.6 },
  subhead: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
    maxWidth: 320,
  },
  form: { gap: 16, marginTop: 32 },
  row: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  muted: { color: AppTheme.colors.muted, fontSize: 16, fontFamily: Fonts.sans },
  link: { color: AppTheme.colors.accentDark, fontWeight: "700", fontSize: 16, textDecorationLine: "underline", fontFamily: Fonts.sans },
});
