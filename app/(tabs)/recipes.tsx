import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/Button";
import { showAlert } from "../../lib/alert";
import { useHousehold } from "../../lib/household-context";
import { supabase } from "../../lib/supabase";
import type { Recipe } from "../../lib/database.types";
import { AppTheme, Fonts } from "../../constants/theme";

function toStringList(value: Recipe["ingredients"] | Recipe["instructions"]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default function Recipes() {
  const { recipes, loading, household, refresh, foodItems } = useHousehold();
  const [generating, setGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleGenerateRecipes = async () => {
    if (!household?.id) {
      showAlert("Error", "No household found.");
      return;
    }

    try {
      setGenerating(true);

      const { error } = await supabase.functions.invoke("generate-recipes", {
        body: { householdId: household.id },
      });

      if (error) {
        showAlert("Error", error.message);
        return;
      }

      await refresh();
      showAlert("Success", "New recipes generated.");
    } catch (err: any) {
      showAlert("Error", err.message ?? "Could not generate recipes.");
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = foodItems.length > 0 && !generating;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Recipes</Text>
          <View style={styles.headerBadge}>
            <Ionicons name="sparkles-outline" size={22} color={AppTheme.colors.text} />
          </View>
        </View>

        <Text style={styles.subtitle}>
          Generate recipe ideas from your pantry with OpenAI.
        </Text>

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={AppTheme.colors.muted} />
            <Text style={styles.emptyText}>
              {foodItems.length === 0
                ? "Add pantry items first, then generate recipes."
                : "No recipes yet. Generate some from your pantry items."}
            </Text>
          </View>
        ) : (
          <View style={styles.recipeList}>
            {recipes.map((recipe) => (
              <Pressable
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() => setSelectedRecipe(recipe)}
              >
                <View style={styles.recipeImageWrap}>
                  <Ionicons name="restaurant" size={36} color={AppTheme.colors.accentDark} />
                </View>
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName}>{recipe.title}</Text>
                  <Text style={styles.recipeDetail}>
                    {recipe.prep_time ? `${recipe.prep_time} min` : "Quick meal idea"}
                  </Text>
                  <Text style={styles.recipeHint}>Tap to view ingredients and steps</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.muted} />
              </Pressable>
            ))}
          </View>
        )}

        <Button
          title={generating ? "Generating..." : "Generate recipes"}
          onPress={handleGenerateRecipes}
          disabled={!canGenerate}
          style={styles.generateBtn}
        />
        {!foodItems.length && !loading ? (
          <Text style={styles.helperText}>
            Add a few pantry items first so OpenAI has ingredients to work with.
          </Text>
        ) : null}
      </ScrollView>

      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecipe(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedRecipe(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedRecipe ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedRecipe.title}</Text>
                  <Pressable onPress={() => setSelectedRecipe(null)} style={styles.closeButton}>
                    <Ionicons name="close" size={18} color={AppTheme.colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.modalMeta}>
                  {selectedRecipe.prep_time ? `${selectedRecipe.prep_time} min` : "Flexible prep time"}
                  {selectedRecipe.servings ? ` • ${selectedRecipe.servings} servings` : ""}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionLabel}>Ingredients</Text>
                  {toStringList(selectedRecipe.ingredients).map((ingredient, index) => (
                    <Text key={`${selectedRecipe.id}-ingredient-${index}`} style={styles.modalBullet}>
                      • {ingredient}
                    </Text>
                  ))}

                  <Text style={styles.sectionLabel}>Instructions</Text>
                  {toStringList(selectedRecipe.instructions).map((step, index) => (
                    <Text key={`${selectedRecipe.id}-step-${index}`} style={styles.modalBullet}>
                      {index + 1}. {step}
                    </Text>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.page,
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AppTheme.colors.cardLavender,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    fontFamily: Fonts.rounded,
    color: AppTheme.colors.text,
  },
  subtitle: {
    fontSize: 18,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.rounded,
    marginTop: 8,
    lineHeight: 26,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: AppTheme.colors.muted,
    fontSize: 16,
    fontFamily: Fonts.rounded,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  recipeList: {
    gap: 12,
    marginTop: 20,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    backgroundColor: AppTheme.colors.surface,
    shadowColor: "#b7d4f5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  recipeImageWrap: {
    width: 81,
    height: 81,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: Fonts.rounded,
    color: AppTheme.colors.text,
  },
  recipeDetail: {
    fontSize: 14,
    color: AppTheme.colors.accentDark,
    fontFamily: Fonts.rounded,
    marginTop: 4,
  },
  recipeHint: {
    fontSize: 13,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.rounded,
    marginTop: 6,
  },
  generateBtn: {
    marginTop: 30,
    width: 238,
    alignSelf: "center",
  },
  helperText: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.muted,
    textAlign: "center",
    fontFamily: Fonts.rounded,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 42, 68, 0.35)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    maxHeight: "82%",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 26,
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
  modalMeta: {
    fontSize: 14,
    color: AppTheme.colors.accentDark,
    fontFamily: Fonts.rounded,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.rounded,
    color: AppTheme.colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  modalBullet: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.rounded,
    marginBottom: 8,
  },
});
