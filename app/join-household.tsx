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

export default function JoinHousehold() {
  const { session } = useAuth();
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...code];
    // Take only last character if user types multiple
    const char = value.slice(-1);
    newCode[index] = char;
    setCode(newCode);

    // Auto-advance to next input
    if (char && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    const inviteCode = code.join("").trim();
    if (inviteCode.length < 4) {
      showAlert("Missing code", "Please enter the full invite code.");
      return;
    }

    setLoading(true);
    const { data: household, error } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (error || !household) {
      setLoading(false);
      showAlert("Not found", "No household matches that invite code.");
      return;
    }

    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: household.id,
      user_id: session!.user.id,
      role: "member",
    });

    setLoading(false);

    if (memberError) {
      showAlert("Error", memberError.message);
      return;
    }

    router.replace("/(tabs)/inventory" as any);
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
              maxLength={2}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="center"
            />
          ))}
        </View>
      </View>

      <Text style={styles.helper}>
        Your housemate can find this code under {"\u201C"}household.{"\u201D"}
      </Text>

      <Button
        variant="pill"
        title={loading ? "Joining\u2026" : "Enter"}
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
    backgroundColor: "white",
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  back: { width: 44, height: 44, justifyContent: "center" },
  arrow: { fontSize: 24, fontWeight: "700" },
  h1: { fontSize: 41, fontWeight: "700", marginTop: 16, marginBottom: 40 },
  codeCard: {
    padding: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  codeBox: {
    flex: 1,
    height: 71,
    backgroundColor: "#d9d9d9",
    borderRadius: 5,
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
  },
  helper: {
    marginTop: 20,
    fontSize: 15,
    color: "#000",
    lineHeight: 22,
  },
  enterBtn: { marginTop: 60 },
});
