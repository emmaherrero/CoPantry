import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { showAlert } from "../lib/alert";
import { AppTheme, Fonts } from "../constants/theme";

export default function CreateHousehold() {
  const { session } = useAuth();
  const [householdName, setHouseholdName] = useState("");
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      showAlert("Missing name", "Give your household a name.");
      return;
    }

    setLoading(true);
    const { data: household, error } = await supabase
      .from("households")
      .insert({ name: householdName.trim() })
      .select()
      .single();

    if (error || !household) {
      setLoading(false);
      showAlert("Error", error?.message ?? "Could not create household.");
      return;
    }

    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: household.id,
      user_id: session!.user.id,
      role: "owner",
    });

    setLoading(false);

    if (memberError) {
      showAlert("Error", memberError.message);
      return;
    }

    showAlert(
      "Household created!",
      `Invite code: ${household.invite_code}\nShare it with your roommates.`,
      () => router.replace("/(tabs)/inventory" as any)
    );
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.arrow}>{"<"}</Text>
      </Pressable>

      <Text style={styles.h1}>How many people are in your household?</Text>

      <Input
        placeholder="Household name (e.g. 831 Pantry)"
        autoCapitalize="words"
        value={householdName}
        onChangeText={setHouseholdName}
      />

      <View style={styles.counterCard}>
        <Pressable
          style={styles.counterBtn}
          onPress={() => setMemberCount(Math.max(1, memberCount - 1))}
        >
          <View style={styles.counterCircle}>
            <Text style={styles.counterSymbol}>-</Text>
          </View>
        </Pressable>

        <Text style={styles.counterValue}>{memberCount}</Text>

        <Pressable
          style={styles.counterBtn}
          onPress={() => setMemberCount(memberCount + 1)}
        >
          <View style={[styles.counterCircle, styles.counterCirclePlus]}>
            <Text style={styles.counterSymbol}>+</Text>
          </View>
        </Pressable>
      </View>

      <Button
        variant="pill"
        title={loading ? "Creating..." : "Enter"}
        onPress={handleCreate}
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
  counterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
    marginTop: 30,
  },
  counterBtn: { padding: 8 },
  counterCircle: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  counterCirclePlus: {},
  counterSymbol: { fontSize: 22, fontWeight: "700", color: AppTheme.colors.text, fontFamily: Fonts.sans },
  counterValue: { fontSize: 32, fontWeight: "700", marginHorizontal: 30, color: AppTheme.colors.text, fontFamily: Fonts.sans },
  enterBtn: { marginTop: 60 },
});
