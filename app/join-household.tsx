import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { showAlert } from "../lib/alert";
import { AppTheme, Fonts } from "../constants/theme";

export default function JoinHousehold() {
  const { session } = useAuth();
  const [code, setCode] = useState(Array.from({ length: 8 }, () => ""));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...code];
    const sanitized = value.replace(/\s/g, "").toLowerCase();

    if (!sanitized) {
      newCode[index] = "";
      setCode(newCode);
      return;
    }

    const chars = sanitized.split("");
    chars.forEach((char, offset) => {
      const targetIndex = index + offset;
      if (targetIndex < newCode.length) {
        newCode[targetIndex] = char;
      }
    });
    setCode(newCode);

    const nextIndex = Math.min(index + chars.length, newCode.length - 1);
    if (nextIndex < newCode.length) {
      inputs.current[nextIndex]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    if (!session?.user.id) {
      showAlert("Error", "You need to be signed in to join a household.");
      return;
    }

    const inviteCode = code.join("").trim().toLowerCase();
    if (inviteCode.length < code.length) {
      showAlert("Missing code", "Please enter the full invite code.");
      return;
    }

    setLoading(true);

    const { count: membershipCount, error: membershipLookupError } = await supabase
      .from("household_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .limit(1);

    if (membershipLookupError) {
      setLoading(false);
      showAlert("Error", membershipLookupError.message);
      return;
    }

    if ((membershipCount ?? 0) > 0) {
      setLoading(false);
      showAlert(
        "Already in a household",
        "Leave your current household before joining a different one.",
      );
      return;
    }

    const { data: household, error } = await supabase
      .from("households")
      .select("id, name")
      .eq("invite_code", inviteCode)
      .single();

    if (error || !household) {
      setLoading(false);
      showAlert("Not found", "No household matches that invite code.");
      return;
    }

    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: household.id,
      user_id: session.user.id,
      role: "member",
    });

    setLoading(false);

    if (memberError) {
      showAlert("Error", memberError.message);
      return;
    }

    showAlert("Joined household", `You joined ${household.name}.`, () => {
      router.replace("/(tabs)/inventory" as any);
    });
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.arrow}>{"<"}</Text>
      </Pressable>

      <Text style={styles.h1}>Please enter your household code</Text>

      <View style={styles.codeCard}>
        <View style={styles.codeRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={styles.codeBox}
              value={digit}
              onChangeText={(v) => handleCodeChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="default"
              maxLength={8}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="center"
            />
          ))}
        </View>
      </View>

      <Text style={styles.helper}>
        Enter the full 8-character code from your housemate.
      </Text>

      <Button
        variant="pill"
        title={loading ? "Joining..." : "Enter"}
        onPress={handleJoin}
        disabled={loading}
        style={styles.enterBtn}
      />
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
  h1: { fontSize: 38, fontWeight: "800", marginTop: 16, marginBottom: 32, fontFamily: Fonts.sans, color: AppTheme.colors.text, letterSpacing: -0.6 },
  codeCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
  },
  codeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  codeBox: {
    width: 58,
    height: 71,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    fontSize: 32,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    textAlign: "center",
    color: AppTheme.colors.text,
  },
  helper: {
    marginTop: 20,
    fontSize: 15,
    color: AppTheme.colors.muted,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  enterBtn: { marginTop: 60 },
});
