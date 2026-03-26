import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FoodItem } from "../lib/database.types";
import Input from "./Input";
import Button from "./Button";
import { AppTheme, Fonts } from "../constants/theme";

type Props = {
  item: FoodItem | null;
  visible: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: {
    product_name: string;
    brand: string | null;
    storage_location: FoodItem["storage_location"];
  }) => void;
};

export default function FoodItemEditorModal({
  item,
  visible,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [storageLocation, setStorageLocation] =
    useState<FoodItem["storage_location"]>("fridge");

  useEffect(() => {
    if (!item) return;

    setProductName(item.product_name);
    setBrand(item.brand ?? "");
    setStorageLocation(item.storage_location);
  }, [item]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit item</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={AppTheme.colors.text} />
            </Pressable>
          </View>

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

            <Text style={styles.label}>Storage location</Text>
            <View style={styles.locationRow}>
              {(["fridge", "freezer", "pantry"] as const).map((loc) => (
                <Pressable
                  key={loc}
                  style={[
                    styles.locationButton,
                    storageLocation === loc && styles.locationButtonActive,
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

          <Button
            title={saving ? "Saving..." : "Save changes"}
            disabled={saving || !productName.trim()}
            onPress={() =>
              onSave({
                product_name: productName.trim(),
                brand: brand.trim() || null,
                storage_location: storageLocation,
              })
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18, 42, 68, 0.35)",
    justifyContent: "flex-end",
    padding: 16,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    padding: 20,
    ...AppTheme.shadow.floating,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  locationRow: {
    flexDirection: "row",
    gap: 8,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
  },
  locationButtonActive: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: AppTheme.colors.accentDark,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  locationTextActive: {
    color: AppTheme.colors.accentDark,
  },
});
