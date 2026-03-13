import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { useHousehold } from "../../lib/household-context";
import Button from "../../components/Button";

export default function Profile() {
  const { session } = useAuth();
  const { userProfile } = useHousehold();
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);
  const [useMyInventoryOnly, setUseMyInventoryOnly] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const displayName =
    userProfile?.display_name ??
    session?.user.user_metadata?.display_name ??
    "User";
  const email = session?.user.email ?? "";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {userProfile?.avatar_url ? (
              <Ionicons name="person" size={48} color="#999" />
            ) : (
              <Ionicons name="person" size={48} color="#999" />
            )}
          </View>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>

        {/* Account section */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Account</Text>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow}>
            <Text style={styles.cardRowText}>Edit name</Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow}>
            <Text style={styles.cardRowText}>Change email</Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow}>
            <Text style={styles.cardRowText}>Change password</Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </Pressable>
        </View>

        {/* Dietary Preferences section */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Dietary Preferences</Text>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow}>
            <Text style={styles.cardRowText}>Allergies</Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </Pressable>
          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardRowText}>Prioritize expiring items</Text>
            <Switch
              value={prioritizeExpiring}
              onValueChange={setPrioritizeExpiring}
              trackColor={{ false: "#d9d9d9", true: "#70ab25" }}
              thumbColor="white"
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardRowText}>
              Use items from my inventory only
            </Text>
            <Switch
              value={useMyInventoryOnly}
              onValueChange={setUseMyInventoryOnly}
              trackColor={{ false: "#d9d9d9", true: "#70ab25" }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardRowText}>Push notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: "#d9d9d9", true: "#70ab25" }}
              thumbColor="white"
            />
          </View>
        </View>

        <Button
          variant="pill"
          title="Log out"
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 93,
    height: 93,
    borderRadius: 47,
    backgroundColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  name: {
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
  },
  email: {
    fontSize: 18,
    color: "#000",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#000",
    marginHorizontal: 18,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  cardRowText: { fontSize: 18, flex: 1 },
  logoutBtn: { marginTop: 20 },
});
