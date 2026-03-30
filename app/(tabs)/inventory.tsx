import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHousehold } from "../../lib/household-context";
import { useAuth } from "../../lib/auth-context";
import type { FoodItem } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { AppTheme, Fonts } from "../../constants/theme";
import FoodItemEditorModal from "../../components/FoodItemEditorModal";
import { showAlert } from "../../lib/alert";

function getExpirationInfo(item: FoodItem) {
  if (!item.expiration_date) return { label: "No date", color: AppTheme.colors.surfaceAlt, textColor: AppTheme.colors.text };

  const now = new Date();
  const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [year, month, day] = item.expiration_date.split("-").map(Number);
  const exp = new Date(year, month - 1, day);
  const diffMs = exp.getTime() - todayAtMidnight.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { label: "Expired", color: AppTheme.colors.redSoft, textColor: "#ff4d50" };
  if (diffDays <= 7) return { label: `${diffDays} day${diffDays !== 1 ? "s" : ""} until expiration`, color: AppTheme.colors.orangeSoft, textColor: "#fa9632" };
  return { label: `${diffDays} days until expiration`, color: AppTheme.colors.greenSoft, textColor: AppTheme.colors.text };
}

type SortOption = "newest" | "expiring" | "name";
type ItemFilter = "all" | "expiring" | "expired";
type StorageFilter = "all" | FoodItem["storage_location"];

const SORT_OPTIONS: SortOption[] = ["newest", "expiring", "name"];
const STORAGE_FILTERS: StorageFilter[] = ["all", "fridge", "freezer", "pantry"];

function getStorageMeta(storageLocation: FoodItem["storage_location"]) {
  switch (storageLocation) {
    case "fridge":
      return {
        label: "Fridge",
        icon: "snow-outline" as const,
        backgroundColor: AppTheme.colors.accentSoft,
        color: AppTheme.colors.accentDark,
      };
    case "freezer":
      return {
        label: "Freezer",
        icon: "cube-outline" as const,
        backgroundColor: AppTheme.colors.cardLavender,
        color: AppTheme.colors.blue,
      };
    default:
      return {
        label: "Pantry",
        icon: "basket-outline" as const,
        backgroundColor: AppTheme.colors.cardPeach,
        color: AppTheme.colors.orange,
      };
  }
}

function getNextSortOption(current: SortOption) {
  const currentIndex = SORT_OPTIONS.indexOf(current);
  return SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length];
}

function getSortLabel(sortOption: SortOption) {
  switch (sortOption) {
    case "expiring":
      return "Expiring";
    case "name":
      return "Name";
    default:
      return "Newest";
  }
}

function getExpirationSortValue(item: FoodItem) {
  if (!item.expiration_date) return Number.POSITIVE_INFINITY;
  return new Date(item.expiration_date).getTime();
}

function StatBox({
  count,
  label,
  countColor,
  active = false,
}: {
  count: number;
  label: string;
  countColor: string;
  active?: boolean;
}) {
  return (
    <View
      style={[
        styles.statBox,
        active && {
          borderColor: countColor,
          backgroundColor: AppTheme.colors.surface,
        },
      ]}
    >
      <Text style={[styles.statCount, { color: countColor }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FoodItemCard({ item, onIncrement, onDecrement, onPress }: {
  item: FoodItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onPress: () => void;
}) {
  const exp = getExpirationInfo(item);
  const storage = getStorageMeta(item.storage_location);

  return (
    <View style={styles.itemCard}>
      <Pressable style={styles.itemMain} onPress={onPress}>
        <View style={styles.itemImageWrap}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Ionicons name="fast-food-outline" size={24} color="#999" />
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.product_name}</Text>
          <View style={styles.itemMetaRow}>
            <View style={[styles.expBadge, { backgroundColor: exp.color }]}>
              <Text style={[styles.expText, { color: exp.textColor }]}>{exp.label}</Text>
            </View>
            <View style={[styles.storageBadge, { backgroundColor: storage.backgroundColor }]}>
              <Ionicons name={storage.icon} size={12} color={storage.color} />
              <Text style={[styles.storageText, { color: storage.color }]}>{storage.label}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      <View style={styles.itemQty}>
        <Pressable onPress={onDecrement} style={styles.qtyBtn}>
          <View style={styles.qtyCircle}>
            <Text style={styles.qtySymbol}>-</Text>
          </View>
        </Pressable>
        <Text style={styles.qtyValue}>{item.quantity}</Text>
        <Pressable onPress={onIncrement} style={styles.qtyBtn}>
          <View style={styles.qtyCircle}>
            <Text style={styles.qtySymbol}>+</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default function Inventory() {
  const { session } = useAuth();
  const { foodItems, loading, upsertFoodItem, removeFoodItem } = useHousehold();
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [storageFilter, setStorageFilter] = useState<StorageFilter>("all");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Filter to user's own items
  const myItems = foodItems.filter((item) => item.added_by === session?.user.id);
  const now = new Date();
  const filteredItems = myItems.filter((item) => {
    const matchesStorage =
      storageFilter === "all" ? true : item.storage_location === storageFilter;

    if (!matchesStorage) return false;
    if (itemFilter === "all") return true;
    if (!item.expiration_date) return false;

    const diff = new Date(item.expiration_date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (itemFilter === "expiring") {
      return days > 0 && days <= 7;
    }

    return new Date(item.expiration_date) < now;
  });
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortOption) {
      case "expiring":
        return getExpirationSortValue(a) - getExpirationSortValue(b);
      case "name":
        return a.product_name.localeCompare(b.product_name);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalItems = myItems.reduce((sum, item) => sum + item.quantity, 0);
  const expiring = myItems.reduce((sum, item) => {
    if (!item.expiration_date) return sum;
    const diff = new Date(item.expiration_date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 7 ? sum + item.quantity : sum;
  }, 0);
  const expired = myItems.reduce((sum, item) => {
    if (!item.expiration_date) return sum;
    return new Date(item.expiration_date) < now ? sum + item.quantity : sum;
  }, 0);

  const updateQuantity = async (item: FoodItem, delta: number) => {
    const newQty = item.quantity + delta;
    const previousItem = item;

    if (newQty <= 0) {
      removeFoodItem(item.id);

      const { error } = await supabase.from("food_items").delete().eq("id", item.id);
      if (error) {
        upsertFoodItem(previousItem);
      }
    } else {
      upsertFoodItem({
        ...item,
        quantity: newQty,
        updated_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from("food_items")
        .update({ quantity: newQty })
        .eq("id", item.id);
      if (error) {
        upsertFoodItem(previousItem);
      }
    }
  };

  const handleSaveItem = async (values: {
    product_name: string;
    brand: string | null;
    storage_location: FoodItem["storage_location"];
  }) => {
    if (!selectedItem) return;

    const previousItem = selectedItem;
    const updatedItem = {
      ...selectedItem,
      product_name: values.product_name,
      brand: values.brand,
      storage_location: values.storage_location,
      updated_at: new Date().toISOString(),
    };

    setSavingItem(true);
    upsertFoodItem(updatedItem);

    const { error } = await supabase
      .from("food_items")
      .update({
        product_name: values.product_name,
        brand: values.brand,
        storage_location: values.storage_location,
      })
      .eq("id", selectedItem.id);

    if (error) {
      upsertFoodItem(previousItem);
      showAlert("Error", error.message);
      setSavingItem(false);
      return;
    }

    setSavingItem(false);
    setSelectedItem(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Inventory</Text>
          <Pressable style={styles.settingsBubble} onPress={() => setShowHelp(true)}>
            <Ionicons name="help-circle-outline" size={22} color={AppTheme.colors.text} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Keep tabs on the items that are assigned to you.
        </Text>

        <View style={styles.stats}>
          <Pressable style={styles.statPressable} onPress={() => setItemFilter("all")}>
            <StatBox
              count={totalItems}
              label="Total Items"
              countColor="#3282fa"
              active={itemFilter === "all"}
            />
          </Pressable>
          <Pressable style={styles.statPressable} onPress={() => setItemFilter("expiring")}>
            <StatBox
              count={expiring}
              label="Expiring"
              countColor="#fa9632"
              active={itemFilter === "expiring"}
            />
          </Pressable>
          <Pressable style={styles.statPressable} onPress={() => setItemFilter("expired")}>
            <StatBox
              count={expired}
              label="Expired"
              countColor="#ff4d50"
              active={itemFilter === "expired"}
            />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {itemFilter === "expiring"
              ? "Use These Soon"
              : itemFilter === "expired"
                ? "Expired Items"
                : "Items"}
          </Text>
          <Pressable
            style={styles.sortRow}
            onPress={() => setSortOption((current) => getNextSortOption(current))}
          >
            <Ionicons name="filter-outline" size={20} color="#000" />
            <Text style={styles.sortText}>Sort: {getSortLabel(sortOption)}</Text>
          </Pressable>
        </View>

        <View style={styles.storageFilters}>
          {STORAGE_FILTERS.map((filter) => {
            const active = storageFilter === filter;
            const meta =
              filter === "all"
                ? {
                    label: "All",
                    icon: "apps-outline" as const,
                    backgroundColor: AppTheme.colors.surfaceAlt,
                    color: AppTheme.colors.text,
                  }
                : getStorageMeta(filter);

            return (
              <Pressable
                key={filter}
                onPress={() => setStorageFilter(filter)}
                style={[
                  styles.storageFilterChip,
                  active && {
                    borderColor: meta.color,
                    backgroundColor: meta.backgroundColor,
                  },
                ]}
              >
                <Ionicons name={meta.icon} size={14} color={meta.color} />
                <Text style={[styles.storageFilterText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {itemFilter === "expiring" ? (
          <Text style={styles.filterMessage}>
            You should use these items soon.
          </Text>
        ) : itemFilter === "expired" ? (
          <Text style={styles.filterMessage}>
            Clean out these items. Do not use them.
          </Text>
        ) : null}

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : sortedItems.length === 0 ? (
          <Text style={styles.emptyText}>No items yet. Tap + to add your first item.</Text>
        ) : (
          <View style={styles.itemList}>
            {sortedItems.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                onIncrement={() => updateQuantity(item, 1)}
                onDecrement={() => updateQuantity(item, -1)}
                onPress={() => setSelectedItem(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showHelp}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHelp(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHelp(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How My Inventory Works</Text>
              <Pressable onPress={() => setShowHelp(false)} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={AppTheme.colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalBody}>
              My Inventory shows only the items currently assigned to you.
            </Text>
            <Text style={styles.modalBullet}>
              • Tap a card to edit the name, brand, or storage location.
            </Text>
            <Text style={styles.modalBullet}>
              • Use + and - to update quantity quickly.
            </Text>
            <Text style={styles.modalBullet}>
              • Tap Expiring or Expired to focus on items that need attention.
            </Text>
            <Text style={styles.modalBullet}>
              • Use the fridge, freezer, and pantry chips to filter by storage spot.
            </Text>
            <Text style={styles.modalBullet}>
              • Sort cycles through newest, expiring, and name.
            </Text>

            <Pressable style={styles.modalButton} onPress={() => setShowHelp(false)}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <FoodItemEditorModal
        item={selectedItem}
        visible={!!selectedItem}
        saving={savingItem}
        onClose={() => {
          if (!savingItem) setSelectedItem(null);
        }}
        onSave={handleSaveItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.page },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingsBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AppTheme.colors.cardLavender,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 38, fontWeight: "800", fontFamily: Fonts.sans, color: AppTheme.colors.text, letterSpacing: -0.6 },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
    maxWidth: 300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 42, 68, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    padding: 22,
    shadowColor: "#7ea9d7",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: Fonts.rounded,
    color: AppTheme.colors.text,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    fontSize: 16,
    lineHeight: 24,
    color: AppTheme.colors.text,
    fontFamily: Fonts.rounded,
    marginBottom: 10,
  },
  modalBullet: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.rounded,
    marginBottom: 8,
  },
  modalButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Fonts.rounded,
    color: AppTheme.colors.text,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  statPressable: { flex: 1 },
  statBox: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.md,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    ...AppTheme.shadow.card,
  },
  statCount: { fontSize: 34, fontWeight: "800", fontFamily: Fonts.sans },
  statLabel: { fontSize: 12, color: AppTheme.colors.muted, marginTop: 4, fontFamily: Fonts.sans },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 28, fontWeight: "800", fontFamily: Fonts.sans, color: AppTheme.colors.text, letterSpacing: -0.4 },
  filterMessage: {
    marginTop: -6,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
  },
  storageFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -4,
    marginBottom: 16,
  },
  storageFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
  },
  storageFilterText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.cardPeach,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortText: { fontSize: 14, color: AppTheme.colors.text, fontFamily: Fonts.sans, fontWeight: "600" },
  emptyText: { color: AppTheme.colors.muted, fontSize: 16, textAlign: "center", marginTop: 40, fontFamily: Fonts.sans },
  itemList: { gap: 12 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
  },
  itemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  itemImageWrap: { marginRight: 12 },
  itemImage: { width: 56, height: 56, borderRadius: 18 },
  itemImagePlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: "700", fontFamily: Fonts.sans, color: AppTheme.colors.text },
  itemMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  expBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  expText: { fontSize: 10, fontWeight: "700", fontFamily: Fonts.sans },
  storageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  storageText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  itemQty: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { padding: 2 },
  qtyCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  qtySymbol: { fontSize: 16, color: AppTheme.colors.text, fontWeight: "700", fontFamily: Fonts.sans },
  qtyValue: { fontSize: 20, fontWeight: "700", fontFamily: Fonts.sans, minWidth: 20, textAlign: "center", color: AppTheme.colors.text },
});
