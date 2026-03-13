import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHousehold } from "../../lib/household-context";
import type { FoodItem } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";

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
            <Text style={styles.qtySymbol}>{"\u2212"}</Text>
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
  const { household, foodItems, members, loading, refresh } = useHousehold();

  const now = new Date();
  const totalItems = foodItems.length;
  const expiring = foodItems.filter((item) => {
    if (!item.expiration_date) return false;
    const diff = new Date(item.expiration_date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 7;
  }).length;
  const expired = foodItems.filter((item) => {
    if (!item.expiration_date) return false;
    return new Date(item.expiration_date) < now;
  }).length;

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
    if (newQty <= 0) {
      await supabase.from("food_items").delete().eq("id", item.id);
    } else {
      await supabase
        .from("food_items")
        .update({ quantity: newQty })
        .eq("id", item.id);
    }
    refresh();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{household?.name ?? "Pantry"}</Text>
          <Ionicons name="settings-outline" size={28} color="#000" />
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
          <View style={styles.sortRow}>
            <Ionicons name="filter-outline" size={20} color="#000" />
            <Text style={styles.sortText}>Sort by</Text>
          </View>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : foodItems.length === 0 ? (
          <Text style={styles.emptyText}>
            No items in the pantry yet. Tap + to add items.
          </Text>
        ) : (
          <View style={styles.itemList}>
            {foodItems.map((item) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 36, fontWeight: "700" },
  codeText: { fontSize: 13, color: "#000", marginTop: 4 },
  stats: { flexDirection: "row", gap: 12, marginTop: 20 },
  statBox: {
    flex: 1,
    backgroundColor: "#d9d9d9",
    borderRadius: 5,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  statCount: { fontSize: 36, fontWeight: "700" },
  statLabel: { fontSize: 13, color: "#000", marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 32, fontWeight: "700" },
  sortRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortText: { fontSize: 15, color: "#3282fa" },
  emptyText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  itemList: { gap: 12 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
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
  itemImageWrap: { marginRight: 12 },
  itemImage: { width: 52, height: 52, borderRadius: 4 },
  itemImagePlaceholder: {
    width: 52,
    height: 52,
    backgroundColor: "#d9d9d9",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: "500" },
  expBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  expText: { fontSize: 9, fontWeight: "700" },
  ownerBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  ownerText: { fontSize: 9, fontWeight: "400" },
  itemQty: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { padding: 2 },
  qtyCircle: {
    width: 26,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#70ab25",
    alignItems: "center",
    justifyContent: "center",
  },
  qtySymbol: { fontSize: 16, color: "#70ab25", fontWeight: "600" },
  qtyValue: {
    fontSize: 20,
    fontWeight: "500",
    minWidth: 20,
    textAlign: "center",
  },
});
