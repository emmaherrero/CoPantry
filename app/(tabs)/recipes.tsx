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
import Button from "../../components/Button";

export default function Recipes() {
  const { recipes, loading } = useHousehold();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Recipes</Text>
          <Ionicons name="settings-outline" size={28} color="#000" />
        </View>
        <Text style={styles.subtitle}>
          Generate recipes based on your pantry items and preferences
        </Text>

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#d9d9d9" />
            <Text style={styles.emptyText}>
              No recipes yet. Generate some based on your pantry items!
            </Text>
          </View>
        ) : (
          <View style={styles.recipeList}>
            {recipes.map((recipe) => {
              const ingredients = Array.isArray(recipe.ingredients)
                ? recipe.ingredients
                : [];

              return (
                <Pressable key={recipe.id} style={styles.recipeCard}>
                  <View style={styles.recipeImageWrap}>
                    <Ionicons
                      name="restaurant"
                      size={36}
                      color="#999"
                    />
                  </View>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{recipe.title}</Text>
                    {recipe.prep_time && (
                      <Text style={styles.recipeDetail}>
                        {recipe.prep_time} min
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Button
          title="Generate more recipes"
          onPress={() => {
            // Placeholder for recipe generation
          }}
          style={styles.generateBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 36, fontWeight: "700" },
  subtitle: { fontSize: 18, color: "#000", marginTop: 8, lineHeight: 26 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  recipeList: { gap: 12, marginTop: 20 },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
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
  recipeImageWrap: {
    width: 81,
    height: 81,
    backgroundColor: "#d9d9d9",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 24, fontWeight: "500" },
  recipeDetail: { fontSize: 14, color: "#666", marginTop: 4 },
  generateBtn: { marginTop: 30, width: 238, alignSelf: "center" },
});
