import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";

function Card({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <Text style={styles.icon}>🏠</Text>
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
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <Text style={styles.h1}>Let’s get set up</Text>

      <View style={{ gap: 15, marginTop: 25 }}>
        <Card title="Create new household" onPress={() => console.log("create household")} />
        <Card title="Join existing household" subtitle="Use your invite code" onPress={() => console.log("join household")} />
      </View>

      <Text style={styles.footer}>
        You can share the shopping list, meal plan, pantry and recipes with your household.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 60, paddingHorizontal: 22 },
  back: { width: 44, height: 44, justifyContent: "center" },
  backText: { fontSize: 30, marginTop: -6 },
  h1: { fontSize: 35, fontWeight: "700", marginTop: 26, marginBottom: 30 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white"
  },
  icon: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardSub: { marginTop: 3, color: "#6B7280", fontSize: 13 },
  footer: { marginTop: 16, color: "#6B7280", fontSize: 12, lineHeight: 16 },
});