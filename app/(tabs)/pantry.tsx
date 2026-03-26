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
import type { FoodItem } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { AppTheme, Fonts } from "../../constants/theme";

function getExpirationInfo(item: FoodItem) {
  if (!item.expiration_date)
    return { label: "No date", color: "#d9d9d9", textColor: "#000" };

  const now = new Date();
  const exp = new Date(item.expiration_date);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { label: "Expired", color: "#ff4d50", textColor: "#000" };
  if (diffDays <= 3)
    return {
      label: `${diffDays} day${diffDays !== 1 ? "s" : ""} until expiration`,
      color: "#fa9632",
      textColor: "#000",
    };
  return {
    label: `${diffDays} days until expiration`,
    color: "#24bb4d",
    textColor: "#000",
  };
}

type SortOption = "newest" | "expiring" | "name";

const SORT_OPTIONS: SortOption[] = ["newest", "expiring", "name"];

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

const MEMBER_COLORS = ["#8bcef0", "#ceb1ff", "#ffbbee", "#ffd6a5", "#a5ffd6"];

function StatBox({
  count,
  label,
  countColor,
}: {
  count: number;
  label: string;
  countColor: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statCount, { color: countColor }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FoodItemCard({
  item,
  ownerName,
  ownerColorIndex,
  onIncrement,
  onDecrement,
}: {
  item: FoodItem;
  ownerName: string | null;
  ownerColorIndex: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const exp = getExpirationInfo(item);

  return (
    <View style={styles.itemCard}>
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
        <View
          style={[styles.expBadge, { backgroundColor: exp.color }]}
        >
          <Text style={styles.expText}>{exp.label}</Text>
        </View>
        {ownerName && (
          <View
            style={[
              styles.ownerBadge,
              { backgroundColor: MEMBER_COLORS[ownerColorIndex % MEMBER_COLORS.length] },
            ]}
          >
            <Text style={styles.ownerText}>{ownerName}</Text>
          </View>
        )}
      </View>

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

export default function Pantry() {
  const { household, foodItems, members, loading, upsertFoodItem, removeFoodItem } =
    useHousehold();
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showHelp, setShowHelp] = useState(false);

  const now = new Date();
  const sortedItems = [...foodItems].sort((a, b) => {
    switch (sortOption) {
      case "expiring":
        return getExpirationSortValue(a) - getExpirationSortValue(b);
      case "name":
        return a.product_name.localeCompare(b.product_name);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  const totalItems = foodItems.reduce((sum, item) => sum + item.quantity, 0);
  const expiring = foodItems.reduce((sum, item) => {
    if (!item.expiration_date) return sum;
    const diff = new Date(item.expiration_date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 7 ? sum + item.quantity : sum;
  }, 0);
  const expired = foodItems.reduce((sum, item) => {
    if (!item.expiration_date) return sum;
    return new Date(item.expiration_date) < now ? sum + item.quantity : sum;
  }, 0);

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.profiles?.display_name ?? null;
  };

  const getMemberColorIndex = (userId: string) => {
    const idx = members.findIndex((m) => m.user_id === userId);
    return idx >= 0 ? idx : 0;
  };

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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{household?.name ?? "Pantry"}</Text>
          <Pressable style={styles.settingsBubble} onPress={() => setShowHelp(true)}>
            <Ionicons name="sparkles-outline" size={22} color={AppTheme.colors.text} />
          </Pressable>
        </View>
        {household?.invite_code && (
          <Text style={styles.codeText}>
            Household code: {household.invite_code.split("").join(" ")}
          </Text>
        )}

        <View style={styles.stats}>
          <StatBox count={totalItems} label="Total Items" countColor="#3282fa" />
          <StatBox count={expiring} label="Expiring" countColor="#fa9632" />
          <StatBox count={expired} label="Expired" countColor="#ff4d50" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Pressable
            style={styles.sortRow}
            onPress={() => setSortOption((current) => getNextSortOption(current))}
          >
            <Ionicons name="filter-outline" size={20} color="#000" />
            <Text style={styles.sortText}>Sort: {getSortLabel(sortOption)}</Text>
          </Pressable>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : sortedItems.length === 0 ? (
          <Text style={styles.emptyText}>
            No items in the pantry yet. Tap + to add items.
          </Text>
        ) : (
          <View style={styles.itemList}>
            {sortedItems.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                ownerName={getMemberName(item.added_by)}
                ownerColorIndex={getMemberColorIndex(item.added_by)}
                onIncrement={() => updateQuantity(item, 1)}
                onDecrement={() => updateQuantity(item, -1)}
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
              <Text style={styles.modalTitle}>How Pantry Works</Text>
              <Pressable onPress={() => setShowHelp(false)} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={AppTheme.colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalBody}>
              Pantry shows the whole household{"'"}s food in one place.
            </Text>
            <Text style={styles.modalBullet}>
              • My Inventory only shows items assigned to you.
            </Text>
            <Text style={styles.modalBullet}>
              • Tap + to add a new item to the pantry.
            </Text>
            <Text style={styles.modalBullet}>
              • Use + and - on any card to change quantity quickly.
            </Text>
            <Text style={styles.modalBullet}>
              • Sort cycles through newest, expiring, and name.
            </Text>
            <Text style={styles.modalBullet}>
              • Expiration badges show no date, expiring soon, or expired.
            </Text>

            <Pressable style={styles.modalButton} onPress={() => setShowHelp(false)}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  title: { fontSize: 38, fontWeight: "800", fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  codeText: { fontSize: 13, color: AppTheme.colors.muted, marginTop: 6, fontFamily: Fonts.rounded },
  settingsBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AppTheme.colors.cardLavender,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
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
  stats: { flexDirection: "row", gap: 12, marginTop: 20 },
  statBox: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.md,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    shadowColor: "#dfcfc4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  statCount: { fontSize: 36, fontWeight: "800", fontFamily: Fonts.rounded },
  statLabel: { fontSize: 13, color: AppTheme.colors.muted, marginTop: 4, fontFamily: Fonts.rounded },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 30, fontWeight: "800", fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.cardLavender,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortText: { fontSize: 15, color: AppTheme.colors.text, fontFamily: Fonts.rounded, fontWeight: "600" },
  emptyText: {
    color: AppTheme.colors.muted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontFamily: Fonts.rounded,
  },
  itemList: { gap: 12 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    backgroundColor: AppTheme.colors.surface,
    shadowColor: "#e4d2c7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  itemImageWrap: { marginRight: 12 },
  itemImage: { width: 56, height: 56, borderRadius: 18 },
  itemImagePlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 17, fontWeight: "700", fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  expBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  expText: { fontSize: 10, fontWeight: "700", fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  ownerBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  ownerText: { fontSize: 10, fontWeight: "600", fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  itemQty: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { padding: 2 },
  qtyCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    backgroundColor: AppTheme.colors.cardMint,
    alignItems: "center",
    justifyContent: "center",
  },
  qtySymbol: { fontSize: 16, color: AppTheme.colors.text, fontWeight: "700", fontFamily: Fonts.rounded },
  qtyValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Fonts.rounded,
    minWidth: 20,
    textAlign: "center",
    color: AppTheme.colors.text,
  },
});
