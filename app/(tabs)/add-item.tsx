import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { useHousehold } from "../../lib/household-context";
import { showAlert } from "../../lib/alert";
import { AppTheme, Fonts } from "../../constants/theme";

type OpenFoodFactsResponse = {
  product?: {
    product_name?: string;
    brands?: string;
  };
};

function formatExpirationInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseExpirationDate(value: string) {
  if (!value.trim()) return null;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, monthText, dayText, yearText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

function isExpiredDate(isoDate: string) {
  const today = new Date();
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const [year, month, day] = isoDate.split("-").map(Number);
  const expiration = new Date(year, month - 1, day);

  return expiration < todayAtMidnight;
}

export default function AddItem() {
  const { session } = useAuth();
  const { household, members, upsertFoodItem, removeFoodItem } = useHousehold();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expirationDate, setExpirationDate] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scanMessage, setScanMessage] = useState("Point your camera at a barcode to scan.");
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [storageLocation, setStorageLocation] = useState<
    "fridge" | "freezer" | "pantry"
  >("fridge");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    session ? [session.user.id] : []
  );
  const [loading, setLoading] = useState(false);
  const [showExpiredPopup, setShowExpiredPopup] = useState(false);
  const scanLineProgress = useRef(new Animated.Value(0)).current;

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const lookupBarcode = async (code: string) => {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands`
    );

    if (!response.ok) {
      throw new Error("Could not look up that barcode.");
    }

    return (await response.json()) as OpenFoodFactsResponse;
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanningBarcode) return;

    setIsScanningBarcode(true);
    setBarcode(data);
    setScanMessage(`Scanned ${data}. Looking up product details...`);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const result = await lookupBarcode(data);
      const scannedProductName = result.product?.product_name?.trim();
      const scannedBrand = result.product?.brands?.trim();

      if (scannedProductName) {
        setProductName(scannedProductName);
      }

      if (scannedBrand) {
        setBrand(scannedBrand);
      }

      setScanMessage(
        scannedProductName
          ? `Found ${scannedProductName}. Finish adding it below.`
          : "Barcode captured. Fill in any missing details below."
      );
    } catch {
      setScanMessage("Barcode captured. Fill in the item details manually.");
    } finally {
      setMode("manual");
      setIsScanningBarcode(false);
    }
  };

  useEffect(() => {
    if (mode !== "scan" || !cameraPermission?.granted) {
      scanLineProgress.stopAnimation();
      scanLineProgress.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineProgress, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineProgress, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      scanLineProgress.stopAnimation();
    };
  }, [mode, cameraPermission?.granted, scanLineProgress]);

  const handleDone = async () => {
    if (!productName.trim()) {
      showAlert("Missing name", "Please enter a product name.");
      return;
    }

    if (!household) {
      showAlert("Error", "No household found.");
      return;
    }

    // Add item for each selected member
    const addedBy = selectedMembers.length > 0 ? selectedMembers[0] : session!.user.id;

    const trimmedProductName = productName.trim();
    const quantityValue = Number(quantity);
    const parsedExpirationDate = parseExpirationDate(expirationDate);

    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      showAlert("Invalid quantity", "Quantity must be 1 or more.");
      return;
    }

    if (parsedExpirationDate === undefined) {
      showAlert("Invalid date", "Please enter the expiration date as MM/DD/YYYY.");
      return;
    }

    if (parsedExpirationDate && isExpiredDate(parsedExpirationDate)) {
      setShowExpiredPopup(true);
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticItem = {
      id: optimisticId,
      household_id: household.id,
      barcode: barcode || null,
      product_name: trimmedProductName,
      brand: brand.trim() || null,
      image_url: null,
      nutrition_json: null,
      quantity: quantityValue,
      unit: "unit",
      storage_location: storageLocation,
      expiration_date: parsedExpirationDate,
      added_by: addedBy,
      created_at: now,
      updated_at: now,
    };

    setLoading(true);
    upsertFoodItem(optimisticItem);

    // Reset form
    setProductName("");
    setBrand("");
    setQuantity("1");
    setExpirationDate("");
    setBarcode("");
    setScanMessage("Point your camera at a barcode to scan.");
    setStorageLocation("fridge");
    setLoading(false);
    router.back();

    const { data: insertedItem, error } = await supabase
      .from("food_items")
      .insert({
        household_id: household.id,
        barcode: barcode || null,
        product_name: trimmedProductName,
        brand: brand.trim() || null,
        quantity: quantityValue,
        expiration_date: parsedExpirationDate,
        storage_location: storageLocation,
        added_by: addedBy,
      })
      .select("*")
      .single();

    if (error) {
      removeFoodItem(optimisticId);
      showAlert("Error", error.message);
      return;
    }

    removeFoodItem(optimisticId);
    if (insertedItem) {
      upsertFoodItem(insertedItem);
    }
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
          !cameraPermission ? (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.cameraText}>Checking camera permission...</Text>
            </View>
          ) : !cameraPermission.granted ? (
            <View style={styles.cameraPlaceholder}>
              <Ionicons
                name="camera-outline"
                size={64}
                color={AppTheme.colors.muted}
              />
              <Text style={styles.cameraText}>
                Camera access is needed to scan pantry items.
              </Text>
              <Button
                title="Allow camera"
                onPress={() => {
                  void requestCameraPermission();
                }}
                style={styles.cameraButton}
              />
              <Pressable onPress={() => setMode("manual")}>
                <Text style={styles.manualLink}>Enter manually instead</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.cameraCard}>
              <CameraView
                style={styles.cameraPreview}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "ean13",
                    "ean8",
                    "upc_a",
                    "upc_e",
                    "code128",
                    "code39",
                    "qr",
                  ],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-55, 55],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.cameraText}>
                {isScanningBarcode ? "Hold steady..." : scanMessage}
              </Text>
              <Pressable onPress={() => setMode("manual")}>
                <Text style={styles.manualLink}>Enter manually instead</Text>
              </Pressable>
            </View>
          )
        ) : (
          <View style={styles.form}>
            {barcode ? (
              <View style={styles.barcodePill}>
                <Ionicons
                  name="barcode-outline"
                  size={16}
                  color={AppTheme.colors.text}
                />
                <Text style={styles.barcodeText}>{barcode}</Text>
                <Pressable onPress={() => setMode("scan")}>
                  <Text style={styles.barcodeLink}>Scan again</Text>
                </Pressable>
              </View>
            ) : null}
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
              keyboardType="numeric"
              value={quantity}
              onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))}
            />
            <Input
              placeholder="Expiration date (MM/DD/YYYY)"
              keyboardType="numeric"
              value={expirationDate}
              onChangeText={(value) => setExpirationDate(formatExpirationInput(value))}
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

        <Text style={styles.label}>Who{"'"}s item is this?</Text>

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
          title={loading ? "Adding..." : "Done"}
          onPress={handleDone}
          disabled={loading}
          style={styles.doneBtn}
        />
      </ScrollView>

      <Modal
        visible={showExpiredPopup}
        animationType="fade"
        transparent
        onRequestClose={() => setShowExpiredPopup(false)}
      >
        <Pressable
          style={styles.expiredOverlay}
          onPress={() => setShowExpiredPopup(false)}
        >
          <Pressable style={styles.expiredCard} onPress={() => {}}>
            <View style={styles.expiredIconWrap}>
              <Ionicons name="alert-circle" size={24} color="#ffffff" />
            </View>
            <Text style={styles.expiredTitle}>This item is already expired</Text>
            <Text style={styles.expiredCopy}>
              Update the date or leave the expiration field empty before adding it.
            </Text>
            <Pressable
              style={styles.expiredButton}
              onPress={() => setShowExpiredPopup(false)}
            >
              <Text style={styles.expiredButtonText}>Okay</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.page },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 40 },
  back: { width: 44, height: 44, justifyContent: "center" },
  arrow: { fontSize: 24, fontWeight: "700", color: AppTheme.colors.text },
  title: { fontSize: 36, fontWeight: "800", fontFamily: Fonts.sans, color: AppTheme.colors.text, letterSpacing: -0.5 },
  toggleLink: { fontSize: 14, color: AppTheme.colors.accentDark, marginTop: 6, marginBottom: 20, fontFamily: Fonts.sans, fontWeight: "600" },
  cameraPlaceholder: {
    height: 374,
    backgroundColor: AppTheme.colors.cardLavender,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cameraCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    overflow: "hidden",
    marginBottom: 20,
  },
  cameraPreview: {
    width: "100%",
    height: 300,
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  scanFrame: {
    width: 220,
    height: 140,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.96)",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 4,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.accent,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  cameraText: { color: AppTheme.colors.muted, fontSize: 15, marginTop: 12, fontFamily: Fonts.sans, textAlign: "center", paddingHorizontal: 16 },
  cameraButton: { width: 180, alignSelf: "center" },
  manualLink: { color: AppTheme.colors.accentDark, fontSize: 14, marginTop: 8, fontFamily: Fonts.sans, fontWeight: "600" },
  form: { gap: 16, marginBottom: 20 },
  barcodePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
  },
  barcodeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  barcodeLink: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: "700",
    color: AppTheme.colors.accentDark,
  },
  label: { fontSize: 18, fontWeight: "700", fontFamily: Fonts.sans, marginTop: 16, marginBottom: 8, color: AppTheme.colors.text },
  locationRow: { flexDirection: "row", gap: 10 },
  locationBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    alignItems: "center",
  },
  locationBtnActive: { backgroundColor: AppTheme.colors.cardPeach, borderColor: AppTheme.colors.line },
  locationText: { fontSize: 15, fontWeight: "700", fontFamily: Fonts.sans, color: AppTheme.colors.text },
  locationTextActive: { color: AppTheme.colors.text },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    marginBottom: 10,
    ...AppTheme.shadow.card,
  },
  memberAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 55, height: 55, borderRadius: 28 },
  memberName: { flex: 1, fontSize: 16, marginLeft: 12, fontFamily: Fonts.sans, fontWeight: "700", color: AppTheme.colors.text },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: AppTheme.colors.accent, borderColor: AppTheme.colors.line },
  expiredOverlay: {
    flex: 1,
    backgroundColor: "rgba(116, 16, 30, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  expiredCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff4f5",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f0a9b0",
    padding: 22,
    alignItems: "center",
    shadowColor: "#cf5f6b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  expiredIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppTheme.colors.red,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  expiredTitle: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: Fonts.sans,
    color: "#8d2634",
    textAlign: "center",
  },
  expiredCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: "#9c4f59",
    textAlign: "center",
  },
  expiredButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.red,
  },
  expiredButtonText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: "#ffffff",
  },
  doneBtn: { marginTop: 20, width: 158, alignSelf: "center" },
});
