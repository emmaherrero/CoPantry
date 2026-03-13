import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { useHousehold } from "../../lib/household-context";
import { showAlert } from "../../lib/alert";

export default function AddItem() {
  const { session } = useAuth();
  const { household, members, refresh } = useHousehold();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expirationDate, setExpirationDate] = useState("");
  const [storageLocation, setStorageLocation] = useState<
    "fridge" | "freezer" | "pantry"
  >("fridge");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    session ? [session.user.id] : []
  );
  const [loading, setLoading] = useState(false);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDone = async () => {
    if (!productName.trim()) {
      showAlert("Missing name", "Please enter a product name.");
      return;
    }

    if (!household) {
      showAlert("Error", "No household found.");
      return;
    }

    setLoading(true);

    // Add item for each selected member
    const addedBy = selectedMembers.length > 0 ? selectedMembers[0] : session!.user.id;

    const { error } = await supabase.from("food_items").insert({
      household_id: household.id,
      product_name: productName.trim(),
      brand: brand.trim() || null,
      quantity: parseInt(quantity) || 1,
      expiration_date: expirationDate || null,
      storage_location: storageLocation,
      added_by: addedBy,
    });

    setLoading(false);

    if (error) {
      showAlert("Error", error.message);
      return;
    }

    // Reset form
    setProductName("");
    setBrand("");
    setQuantity("1");
    setExpirationDate("");
    setStorageLocation("fridge");
    refresh();
    showAlert("Added!", `${productName} has been added to your pantry.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.arrow}>{"<"}</Text>
        </Pressable>

        <Text style={styles.title}>
          {mode === "scan" ? "Scan Barcode" : "Add Item"}
        </Text>

        <Pressable onPress={() => setMode(mode === "scan" ? "manual" : "scan")}>
          <Text style={styles.toggleLink}>
            {mode === "scan" ? "Enter manually" : "Scan barcode"}
          </Text>
        </Pressable>

        {mode === "scan" ? (
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="camera-outline" size={64} color="#999" />
            <Text style={styles.cameraText}>
              Camera barcode scanning coming soon
            </Text>
            <Pressable onPress={() => setMode("manual")}>
              <Text style={styles.manualLink}>Enter manually instead</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              placeholder="Product name"
              autoCapitalize="words"
              value={productName}
              onChangeText={setProductName}
            />
            <Input
              placeholder="Brand (optional)"
              autoCapitalize="words"
              value={brand}
              onChangeText={setBrand}
            />
            <Input
              placeholder="Quantity"
              keyboardType="default"
              value={quantity}
              onChangeText={setQuantity}
            />
            <Input
              placeholder="Expiration date (YYYY-MM-DD)"
              value={expirationDate}
              onChangeText={setExpirationDate}
            />

            <Text style={styles.label}>Storage location</Text>
            <View style={styles.locationRow}>
              {(["fridge", "freezer", "pantry"] as const).map((loc) => (
                <Pressable
                  key={loc}
                  style={[
                    styles.locationBtn,
                    storageLocation === loc && styles.locationBtnActive,
                  ]}
                  onPress={() => setStorageLocation(loc)}
                >
                  <Text
                    style={[
                      styles.locationText,
                      storageLocation === loc && styles.locationTextActive,
                    ]}
                  >
                    {loc.charAt(0).toUpperCase() + loc.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>Who{"\u2019"}s item is this?</Text>

        {members.map((member) => (
          <Pressable
            key={member.user_id}
            style={styles.memberRow}
            onPress={() => toggleMember(member.user_id)}
          >
            <View style={styles.memberAvatar}>
              {member.profiles?.avatar_url ? (
                <Image
                  source={{ uri: member.profiles.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={28} color="#999" />
              )}
            </View>
            <Text style={styles.memberName}>
              {member.profiles?.display_name ?? "Unknown"}
            </Text>
            <View
              style={[
                styles.checkbox,
                selectedMembers.includes(member.user_id) && styles.checkboxActive,
              ]}
            >
              {selectedMembers.includes(member.user_id) && (
                <Ionicons name="checkmark" size={18} color="white" />
              )}
            </View>
          </Pressable>
        ))}

        <Button
          title={loading ? "Adding\u2026" : "Done"}
          onPress={handleDone}
          disabled={loading}
          style={styles.doneBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 40 },
  back: { width: 44, height: 44, justifyContent: "center" },
  arrow: { fontSize: 24, fontWeight: "700" },
  title: { fontSize: 32, fontWeight: "600" },
  toggleLink: { fontSize: 15, color: "#3282fa", marginTop: 4, marginBottom: 20 },
  cameraPlaceholder: {
    height: 374,
    backgroundColor: "#d9d9d9",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cameraText: { color: "#666", fontSize: 16, marginTop: 12 },
  manualLink: { color: "#3282fa", fontSize: 15, marginTop: 8 },
  form: { gap: 16, marginBottom: 20 },
  label: { fontSize: 18, fontWeight: "500", marginTop: 16, marginBottom: 8 },
  locationRow: { flexDirection: "row", gap: 10 },
  locationBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
  },
  locationBtnActive: { backgroundColor: "#70ab25", borderColor: "#70ab25" },
  locationText: { fontSize: 15, fontWeight: "500" },
  locationTextActive: { color: "white" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "white",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 55, height: 55, borderRadius: 28 },
  memberName: { flex: 1, fontSize: 18, marginLeft: 12 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#70ab25", borderColor: "#70ab25" },
  doneBtn: { marginTop: 20, width: 158, alignSelf: "center" },
});
