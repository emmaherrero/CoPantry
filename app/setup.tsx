import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

      <Text style={styles.h1}>Let{"\u2019"}s get{"\n"}set up</Text>

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
    backgroundColor: "white",
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  back: { width: 44, height: 44, justifyContent: "center" },
  arrow: { fontSize: 24, fontWeight: "700" },
  h1: { fontSize: 41, fontWeight: "700", marginTop: 16, marginBottom: 30 },
  cards: { gap: 25 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
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
  cardIcon: { width: 41, height: 41, alignItems: "center", justifyContent: "center" },
  houseIconWrap: { position: "relative" },
  plusBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "500" },
  cardSub: { marginTop: 4, color: "#000", fontSize: 15 },
  footer: { marginTop: 25, color: "#000", fontSize: 15, lineHeight: 22 },
});
