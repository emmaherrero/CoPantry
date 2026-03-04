import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, Modal } from "react-native";
import { router } from "expo-router";
import Input from "../components/Input";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

function Card({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <Text style={styles.icon}>🏠</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

export default function Setup() {
  const { session } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      Alert.alert("Missing name", "Give your household a name.");
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
      Alert.alert("Error", error?.message ?? "Could not create household.");
      return;
    }

    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: household.id,
      user_id: session!.user.id,
      role: "owner",
    });

    setLoading(false);

    if (memberError) {
      Alert.alert("Error", memberError.message);
      return;
    }

    Alert.alert("Household created!", `Invite code: ${household.invite_code}\nShare it with your roommates.`);
    setShowCreate(false);
    // TODO: navigate to home/dashboard when it exists
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Missing code", "Enter the invite code.");
      return;
    }

    setLoading(true);
    const { data: household, error } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode.trim())
      .single();

    if (error || !household) {
      setLoading(false);
      Alert.alert("Not found", "No household matches that invite code.");
      return;
    }

    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: household.id,
      user_id: session!.user.id,
      role: "member",
    });

    setLoading(false);

    if (memberError) {
      Alert.alert("Error", memberError.message);
      return;
    }

    Alert.alert("Joined!", "You've joined the household.");
    setShowJoin(false);
    // TODO: navigate to home/dashboard when it exists
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <Text style={styles.h1}>Let's get set up</Text>

      <View style={{ gap: 15, marginTop: 25 }}>
        <Card title="Create new household" onPress={() => setShowCreate(true)} />
        <Card title="Join existing household" subtitle="Use your invite code" onPress={() => setShowJoin(true)} />
      </View>

      <Text style={styles.footer}>
        You can share the shopping list, meal plan, pantry and recipes with your household.
      </Text>

      {/* Create household modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Name your household</Text>
            <Input
              placeholder="e.g. Apartment 4B"
              autoCapitalize="sentences"
              value={householdName}
              onChangeText={setHouseholdName}
            />
            <Button
              title={loading ? "Creating…" : "Create"}
              onPress={handleCreate}
              disabled={loading}
            />
            <Pressable onPress={() => setShowCreate(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Join household modal */}
      <Modal visible={showJoin} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Enter invite code</Text>
            <Input
              placeholder="e.g. a1b2c3d4"
              value={inviteCode}
              onChangeText={setInviteCode}
            />
            <Button
              title={loading ? "Joining…" : "Join"}
              onPress={handleJoin}
              disabled={loading}
            />
            <Pressable onPress={() => setShowJoin(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 60, paddingHorizontal: 22 },
  back: { width: 44, height: 44, justifyContent: "center" },
  backText: { fontSize: 30, marginTop: -6 },
  h1: { fontSize: 35, fontWeight: "700", marginTop: 26, marginBottom: 30 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white"
  },
  icon: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardSub: { marginTop: 3, color: "#6B7280", fontSize: 13 },
  footer: { marginTop: 16, color: "#6B7280", fontSize: 12, lineHeight: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  cancel: { alignItems: "center", paddingTop: 8 },
  cancelText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
});
