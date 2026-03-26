import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme, Fonts } from "../constants/theme";

function Card({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.cardIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

export default function Setup() {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.arrow}>{"<"}</Text>
      </Pressable>

      <Text style={styles.h1}>Let{"'"}s get{"\n"}set up</Text>

      <View style={styles.cards}>
        <Card
          title="Create new household"
          icon={
            <View style={styles.houseIconWrap}>
              <Ionicons name="home-outline" size={28} color="#000" />
              <View style={styles.plusBadge}>
                <Ionicons name="add" size={12} color="#000" />
              </View>
            </View>
          }
          onPress={() => router.push("/create-household")}
        />
        <Card
          title="Join existing household"
          subtitle="Use your invite code"
          icon={<Ionicons name="home-outline" size={28} color="#000" />}
          onPress={() => router.push("/join-household")}
        />
      </View>

      <Text style={styles.footer}>
        You can share the shopping list, meal plan, pantry and recipes with your
        household.
      </Text>
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
  h1: { fontSize: 41, fontWeight: "800", marginTop: 16, marginBottom: 30, fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  cards: { gap: 25 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    backgroundColor: AppTheme.colors.surface,
    shadowColor: "#b7d4f5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  cardIcon: { width: 41, height: 41, alignItems: "center", justifyContent: "center" },
  houseIconWrap: { position: "relative" },
  plusBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", fontFamily: Fonts.rounded, color: AppTheme.colors.text },
  cardSub: { marginTop: 4, color: AppTheme.colors.muted, fontSize: 15, fontFamily: Fonts.rounded },
  footer: { marginTop: 25, color: AppTheme.colors.muted, fontSize: 15, lineHeight: 22, fontFamily: Fonts.rounded },
});
