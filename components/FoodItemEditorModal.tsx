import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FoodItem } from "../lib/database.types";
import Input from "./Input";
import Button from "./Button";
import { AppTheme, Fonts } from "../constants/theme";
import { showAlert } from "../lib/alert";
import { estimateExpirationDate } from "../lib/openai";

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateInput(value: string) {
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

function formatDateForInput(value: string | null) {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  return `${match[2]}/${match[3]}/${match[1]}`;
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readPurchaseDate(item: FoodItem | null) {
  const dateMeta =
    item?.nutrition_json &&
    typeof item.nutrition_json === "object" &&
    !Array.isArray(item.nutrition_json) &&
    "date_meta" in item.nutrition_json &&
    item.nutrition_json.date_meta &&
    typeof item.nutrition_json.date_meta === "object" &&
    !Array.isArray(item.nutrition_json.date_meta)
      ? item.nutrition_json.date_meta
      : null;

  const purchaseDate =
    dateMeta && "purchase_date" in dateMeta && typeof dateMeta.purchase_date === "string"
      ? dateMeta.purchase_date
      : null;

  return purchaseDate;
}

function readDateMeta(item: FoodItem | null) {
  if (
    !item?.nutrition_json ||
    typeof item.nutrition_json !== "object" ||
    Array.isArray(item.nutrition_json) ||
    !("date_meta" in item.nutrition_json) ||
    !item.nutrition_json.date_meta ||
    typeof item.nutrition_json.date_meta !== "object" ||
    Array.isArray(item.nutrition_json.date_meta)
  ) {
    return null;
  }

  return item.nutrition_json.date_meta as Record<string, unknown>;
}

function inferItemCategory(productName: string) {
  const normalized = productName.trim().toLowerCase();

  const poultryTerms = ["chicken", "turkey", "duck", "hen", "poultry"];
  const meatTerms = [
    "beef",
    "steak",
    "ground beef",
    "burger",
    "pork",
    "ham",
    "bacon",
    "sausage",
    "lamb",
    "veal",
  ];

  if (poultryTerms.some((term) => normalized.includes(term))) {
    return "poultry" as const;
  }

  if (meatTerms.some((term) => normalized.includes(term))) {
    return "meat" as const;
  }

  return "general" as const;
}

function readItemCategory(item: FoodItem | null) {
  if (
    !item?.nutrition_json ||
    typeof item.nutrition_json !== "object" ||
    Array.isArray(item.nutrition_json) ||
    !("item_meta" in item.nutrition_json) ||
    !item.nutrition_json.item_meta ||
    typeof item.nutrition_json.item_meta !== "object" ||
    Array.isArray(item.nutrition_json.item_meta)
  ) {
    return item ? inferItemCategory(item.product_name) : "general";
  }

  const category =
    "category" in item.nutrition_json.item_meta &&
    typeof item.nutrition_json.item_meta.category === "string"
      ? item.nutrition_json.item_meta.category
      : inferItemCategory(item.product_name);

  return category === "meat" || category === "poultry" || category === "general"
    ? category
    : "general";
}

function sanitizeQuantityInput(value: string, allowDecimal: boolean) {
  if (!allowDecimal) {
    return value.replace(/\D/g, "");
  }

  const sanitized = value.replace(/[^0-9.]/g, "");
  const firstDecimalIndex = sanitized.indexOf(".");

  if (firstDecimalIndex === -1) {
    return sanitized;
  }

  return (
    sanitized.slice(0, firstDecimalIndex + 1) +
    sanitized.slice(firstDecimalIndex + 1).replace(/\./g, "")
  );
}

type Props = {
  item: FoodItem | null;
  visible: boolean;
  saving?: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (values: {
    product_name: string;
    brand: string | null;
    storage_location: FoodItem["storage_location"];
    image_url: string | null;
    quantity: number;
    expiration_date: string | null;
    nutrition_json: FoodItem["nutrition_json"];
  }) => void;
};

export default function FoodItemEditorModal({
  item,
  visible,
  saving = false,
  onClose,
  onDelete,
  onSave,
}: Props) {
  const usesWeightUnit = item?.unit === "lbs" || item?.unit === "kgs";
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expirationDate, setExpirationDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [boughtToday, setBoughtToday] = useState(false);
  const [itemCategory, setItemCategory] = useState<"general" | "meat" | "poultry">("general");
  const [dateMode, setDateMode] = useState<"expiration" | "purchase">("expiration");
  const [storageLocation, setStorageLocation] =
    useState<FoodItem["storage_location"]>("fridge");
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (!item) return;

    setProductName(item.product_name);
    setBrand(item.brand ?? "");
    setImageUrl(item.image_url ?? null);
    setQuantity(String(item.quantity));
    setExpirationDate(formatDateForInput(item.expiration_date));
    setPurchaseDate(formatDateForInput(readPurchaseDate(item)));
    setBoughtToday(readPurchaseDate(item) === getTodayIsoDate());
    setItemCategory(readItemCategory(item));
    setDateMode(readPurchaseDate(item) ? "purchase" : "expiration");
    setStorageLocation(item.storage_location);
  }, [item]);

  const pickItemImage = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showAlert(
        "Permission needed",
        source === "camera"
          ? "Camera access is required to take an item photo."
          : "Photo library access is required to choose an item photo.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      showAlert("Could not update photo", "No image was selected.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setImageUrl(asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri);
  };

  const handlePhotoPress = () => {
    Alert.alert("Update item photo", undefined, [
      {
        text: "Take Photo",
        onPress: () => {
          void pickItemImage("camera");
        },
      },
      {
        text: "Choose From Library",
        onPress: () => {
          void pickItemImage("library");
        },
      },
      ...(imageUrl
        ? [
            {
              text: "Remove Photo",
              style: "destructive" as const,
              onPress: () => setImageUrl(null),
            },
          ]
        : []),
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const handleSavePress = async () => {
    const nextProductName = productName.trim();
    const nextQuantity = Number(quantity);

    if (!nextProductName) {
      showAlert("Missing name", "Please enter a product name.");
      return;
    }

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      showAlert(
        "Invalid quantity",
        usesWeightUnit ? "Enter a weight greater than 0." : "Quantity must be 1 or more.",
      );
      return;
    }

    if (!usesWeightUnit && !Number.isInteger(nextQuantity)) {
      showAlert("Invalid quantity", "Quantity must be a whole number.");
      return;
    }

    const parsedExpirationDate =
      dateMode === "expiration" ? parseDateInput(expirationDate) : null;
    const parsedPurchaseDate =
      dateMode === "purchase"
        ? boughtToday
          ? getTodayIsoDate()
          : parseDateInput(purchaseDate)
        : null;

    if (dateMode === "expiration" && parsedExpirationDate === null) {
      showAlert("Missing date", "Please enter the expiration date.");
      return;
    }

    if (dateMode === "expiration" && parsedExpirationDate === undefined) {
      showAlert("Invalid date", "Please enter the expiration date as MM/DD/YYYY.");
      return;
    }

    if (dateMode === "purchase" && parsedPurchaseDate === null) {
      showAlert("Missing date", "Please enter the purchase date.");
      return;
    }

    if (dateMode === "purchase" && parsedPurchaseDate === undefined) {
      showAlert("Invalid date", "Please enter the purchase date as MM/DD/YYYY.");
      return;
    }

    let nextExpirationDate = parsedExpirationDate;
    let nextNutritionJson: FoodItem["nutrition_json"] = null;
    const nextItemMeta = {
      category: itemCategory,
      uses_weight: usesWeightUnit,
    };

    if (dateMode === "purchase" && parsedPurchaseDate) {
      try {
        setEstimating(true);
        const estimate = await estimateExpirationDate({
          productName: nextProductName,
          brand: brand.trim() || null,
          storageLocation,
          purchaseDate: parsedPurchaseDate,
          itemCategory,
          });
        nextExpirationDate = estimate.expirationDate;
        nextNutritionJson = {
          item_meta: nextItemMeta,
          date_meta: {
            purchase_date: parsedPurchaseDate,
            expiration_source: "ai_estimate",
            shelf_life_days: estimate.shelfLifeDays,
            confidence: estimate.confidence,
            reasoning: estimate.reasoning,
          },
        };
      } catch (error: any) {
        showAlert(
          "Could not estimate expiration",
          error?.message ?? "Please enter an expiration date manually instead.",
        );
        return;
      } finally {
        setEstimating(false);
      }
    } else if (dateMode === "expiration") {
      const existingDateMeta = readDateMeta(item);
      nextNutritionJson = existingDateMeta
        ? {
            item_meta: nextItemMeta,
            date_meta: existingDateMeta,
          }
        : {
            item_meta: nextItemMeta,
          };
    }

    onSave({
      product_name: nextProductName,
      brand: brand.trim() || null,
      storage_location: storageLocation,
      image_url: imageUrl,
      quantity: nextQuantity,
      expiration_date: nextExpirationDate,
      nutrition_json: nextNutritionJson,
    });
  };

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
            <View style={styles.photoSection}>
              <Pressable
                style={styles.photoButton}
                onPress={handlePhotoPress}
                accessibilityRole="button"
                accessibilityLabel="Update item photo"
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={26} color={AppTheme.colors.muted} />
                    <Text style={styles.photoPlaceholderText}>Add item photo</Text>
                  </View>
                )}
                <View style={styles.photoBadge}>
                  <Ionicons name="camera-outline" size={14} color={AppTheme.colors.text} />
                </View>
              </Pressable>
              <Text style={styles.photoHelper}>
                {imageUrl ? "Tap photo to change it" : "Tap photo to add one"}
              </Text>
            </View>
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

            <Text style={styles.label}>Item type</Text>
            <View style={styles.locationRow}>
              {(["general", "meat", "poultry"] as const).map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.locationButton,
                    itemCategory === category && styles.locationButtonActive,
                  ]}
                  onPress={() => setItemCategory(category)}
                >
                  <Text
                    style={[
                      styles.locationText,
                      itemCategory === category && styles.locationTextActive,
                    ]}
                  >
                    {category === "general"
                      ? "General"
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{usesWeightUnit ? `Weight (${item?.unit})` : "Quantity"}</Text>
            <View style={styles.quantityRow}>
              <Pressable
                style={[
                  styles.quantityButton,
                  Number(quantity || "0") <= (usesWeightUnit ? 0.1 : 1) &&
                    styles.quantityButtonDisabled,
                ]}
                onPress={() =>
                  setQuantity((current) =>
                    String(
                      Math.max(
                        usesWeightUnit ? 0.1 : 1,
                        Number((Number(current || "0") - (usesWeightUnit ? 0.5 : 1)).toFixed(2)),
                      ),
                    ),
                  )
                }
                disabled={Number(quantity || "0") <= (usesWeightUnit ? 0.1 : 1)}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </Pressable>
              <Input
                placeholder={usesWeightUnit ? "Weight" : "Quantity"}
                keyboardType={usesWeightUnit ? "decimal-pad" : "numeric"}
                value={quantity}
                onChangeText={(value) =>
                  setQuantity(sanitizeQuantityInput(value, usesWeightUnit) || "1")
                }
                containerStyle={styles.quantityInput}
              />
              <Pressable
                style={styles.quantityButton}
                onPress={() =>
                  setQuantity((current) =>
                    String(
                      Number((Number(current || "0") + (usesWeightUnit ? 0.5 : 1)).toFixed(2)),
                    ),
                  )
                }
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Date type</Text>
            <View style={styles.locationRow}>
              <Pressable
                style={[
                  styles.locationButton,
                  dateMode === "expiration" && styles.locationButtonActive,
                ]}
                onPress={() => setDateMode("expiration")}
              >
                <Text
                  style={[
                    styles.locationText,
                    dateMode === "expiration" && styles.locationTextActive,
                  ]}
                >
                  Expiration
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.locationButton,
                  dateMode === "purchase" && styles.locationButtonActive,
                ]}
                onPress={() => setDateMode("purchase")}
              >
                <Text
                  style={[
                    styles.locationText,
                    dateMode === "purchase" && styles.locationTextActive,
                  ]}
                >
                  Bought date
                </Text>
              </Pressable>
            </View>

            {dateMode === "expiration" ? (
              <Input
                placeholder="Expiration date (MM/DD/YYYY)"
                keyboardType="numeric"
                value={expirationDate}
                onChangeText={(value) => setExpirationDate(formatDateInput(value))}
              />
            ) : (
              <>
                <Input
                  placeholder="Bought date (MM/DD/YYYY)"
                  keyboardType="numeric"
                  value={purchaseDate}
                  onChangeText={(value) => setPurchaseDate(formatDateInput(value))}
                  containerStyle={boughtToday ? styles.disabledInput : undefined}
                />
                <Pressable
                  style={styles.todayRow}
                  onPress={() => setBoughtToday((current) => !current)}
                >
                  <View
                    style={[
                      styles.todayCheckbox,
                      boughtToday && styles.todayCheckboxActive,
                    ]}
                  >
                    {boughtToday ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
                  </View>
                  <Text style={styles.todayText}>Bought today</Text>
                </Pressable>
                <Text style={styles.helperText}>
                  Saving will re-estimate the expiration date from this purchase date.
                </Text>
              </>
            )}

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

          <View style={styles.footerActions}>
            {onDelete ? (
              <Pressable
                style={[styles.deleteButton, (saving || estimating) && styles.deleteButtonDisabled]}
                onPress={onDelete}
                disabled={saving || estimating}
              >
                <Ionicons name="trash-outline" size={16} color={AppTheme.colors.red} />
                <Text style={styles.deleteButtonText}>Delete item</Text>
              </Pressable>
            ) : null}
            <Button
              title={estimating ? "Estimating..." : saving ? "Saving..." : "Save changes"}
              disabled={saving || estimating || !productName.trim()}
              onPress={() => {
                void handleSavePress();
              }}
            />
          </View>
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
  footerActions: {
    gap: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: "#f0a9b0",
    backgroundColor: "#fff4f5",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.red,
  },
  photoSection: {
    alignItems: "center",
    gap: 8,
  },
  photoButton: {
    position: "relative",
  },
  photoPreview: {
    width: 112,
    height: 112,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
  },
  photoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  photoPlaceholderText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.muted,
    textAlign: "center",
  },
  photoBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppTheme.colors.cardLavender,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  photoHelper: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.accentDark,
  },
  helperText: {
    marginTop: -6,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.muted,
  },
  disabledInput: {
    opacity: 0.45,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -6,
  },
  todayCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCheckboxActive: {
    backgroundColor: AppTheme.colors.accentDark,
    borderColor: AppTheme.colors.accentDark,
  },
  todayText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    fontWeight: "600",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quantityButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.45,
  },
  quantityButtonText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  quantityInput: {
    flex: 1,
    marginBottom: 0,
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
