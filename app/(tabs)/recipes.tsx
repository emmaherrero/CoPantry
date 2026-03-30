import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Button from "../../components/Button";
import { AppTheme, Fonts } from "../../constants/theme";
import { showAlert } from "../../lib/alert";
import type { Recipe } from "../../lib/database.types";
import { useHousehold } from "../../lib/household-context";
import { supabase } from "../../lib/supabase";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

function toStringList(value: Recipe["ingredients"] | Recipe["instructions"]) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default function Recipes() {
  const { recipes, loading, household, refresh, foodItems } = useHousehold();
  const [generating, setGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);
  const [useMyInventoryOnly, setUseMyInventoryOnly] = useState(false);
  const [keepMealsEasy, setKeepMealsEasy] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const getFunctionErrorMessage = async (error: unknown) => {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        const message = payload?.error;
        if (typeof message === "string" && message.trim()) {
          return message;
        }
      } catch {
        return error.message;
      }
    }

    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Could not generate recipes.";
  };

  const handleGenerateRecipes = async () => {
    if (!household?.id) {
      showAlert("Error", "No household found.");
      return;
    }

    try {
      setGenerating(true);

      const { error } = await supabase.functions.invoke("generate-recipes", {
        body: {
          householdId: household.id,
          prioritizeExpiring,
          useMyInventoryOnly,
          keepMealsEasy,
        },
      });

      if (error) {
        showAlert("Error", await getFunctionErrorMessage(error));
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
          <Pressable
            style={styles.headerBadge}
            onPress={() => setShowHelp(true)}
          >
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={AppTheme.colors.text}
            />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Generate recipe ideas using your pantry.
        </Text>

        <View style={styles.preferenceCard}>
          <Text style={styles.preferenceTitle}>Recipe settings</Text>
          <Text style={styles.preferenceCopy}>
            Adjust how suggestions are generated for this household.
          </Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextWrap}>
              <Text style={styles.preferenceLabel}>
                Prioritize expiring items
              </Text>
              <Text style={styles.preferenceHint}>
                Focus meal ideas on food that should be used up soon.
              </Text>
            </View>
            <Switch
              value={prioritizeExpiring}
              onValueChange={setPrioritizeExpiring}
              trackColor={{
                false: AppTheme.colors.surfaceAlt,
                true: AppTheme.colors.green,
              }}
              thumbColor="white"
            />
          </View>

          <View style={styles.preferenceDivider} />

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextWrap}>
              <Text style={styles.preferenceLabel}>
                Use items from my inventory only
              </Text>
              <Text style={styles.preferenceHint}>
                Limit recipe ideas to foods currently assigned to you.
              </Text>
            </View>
            <Switch
              value={useMyInventoryOnly}
              onValueChange={setUseMyInventoryOnly}
              trackColor={{
                false: AppTheme.colors.surfaceAlt,
                true: AppTheme.colors.green,
              }}
              thumbColor="white"
            />
          </View>

          <View style={styles.preferenceDivider} />

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextWrap}>
              <Text style={styles.preferenceLabel}>
                Beginner-friendly recipes
              </Text>
              <Text style={styles.preferenceHint}>
                Favor simple meals with common tools, short steps, and low
                effort cleanup.
              </Text>
            </View>
            <Switch
              value={keepMealsEasy}
              onValueChange={setKeepMealsEasy}
              trackColor={{
                false: AppTheme.colors.surfaceAlt,
                true: AppTheme.colors.green,
              }}
              thumbColor="white"
            />
          </View>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="restaurant-outline"
              size={48}
              color={AppTheme.colors.muted}
            />
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
                  <Ionicons
                    name="restaurant"
                    size={36}
                    color={AppTheme.colors.accentDark}
                  />
                </View>
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName}>{recipe.title}</Text>
                  <Text style={styles.recipeDetail}>
                    {recipe.prep_time
                      ? `${recipe.prep_time} min`
                      : "Quick meal idea"}
                  </Text>
                  <Text style={styles.recipeHint}>
                    Tap to view ingredients and steps
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={AppTheme.colors.muted}
                />
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
        visible={showHelp}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHelp(false)}
      >
        <Pressable
          style={styles.helpOverlay}
          onPress={() => setShowHelp(false)}
        >
          <Pressable style={styles.helpCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How Recipes Works</Text>
              <Pressable
                onPress={() => setShowHelp(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={18} color={AppTheme.colors.text} />
              </Pressable>
            </View>

            <Text style={styles.helpBody}>
              Recipes turns your pantry items into meal ideas you can actually
              use.
            </Text>
            <Text style={styles.helpBullet}>
              • Prioritize expiring items to use food before it goes bad.
            </Text>
            <Text style={styles.helpBullet}>
              • Use My Inventory Only to generate meals from foods assigned to
              you.
            </Text>
            <Text style={styles.helpBullet}>
              • Beginner-friendly recipes keeps suggestions simpler and lower
              effort.
            </Text>
            <Text style={styles.helpBullet}>
              • Tap Generate Recipes to create a fresh batch of meal ideas.
            </Text>
            <Text style={styles.helpBullet}>
              • Tap any recipe card to view ingredients and instructions.
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => setShowHelp(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecipe(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedRecipe(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedRecipe ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedRecipe.title}</Text>
                  <Pressable
                    onPress={() => setSelectedRecipe(null)}
                    style={styles.closeButton}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={AppTheme.colors.text}
                    />
                  </Pressable>
                </View>

                <Text style={styles.modalMeta}>
                  {selectedRecipe.prep_time
                    ? `${selectedRecipe.prep_time} min`
                    : "Flexible prep time"}
                  {selectedRecipe.servings
                    ? ` • ${selectedRecipe.servings} servings`
                    : ""}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionLabel}>Ingredients</Text>
                  {toStringList(selectedRecipe.ingredients).map(
                    (ingredient, index) => (
                      <Text
                        key={`${selectedRecipe.id}-ingredient-${index}`}
                        style={styles.modalBullet}
                      >
                        • {ingredient}
                      </Text>
                    ),
                  )}

                  <Text style={styles.sectionLabel}>Instructions</Text>
                  {toStringList(selectedRecipe.instructions).map(
                    (step, index) => (
                      <Text
                        key={`${selectedRecipe.id}-step-${index}`}
                        style={styles.modalBullet}
                      >
                        {index + 1}. {step}
                      </Text>
                    ),
                  )}
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
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 16,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
    marginTop: 8,
    lineHeight: 24,
  },
  preferenceCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
  },
  preferenceTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  preferenceCopy: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
  },
  preferenceRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  preferenceTextWrap: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.text,
    fontFamily: Fonts.sans,
  },
  preferenceHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
  },
  preferenceDivider: {
    height: 1,
    marginTop: 16,
    backgroundColor: AppTheme.colors.accentSoft,
  },
  helpCard: {
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
  helpOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 42, 68, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: AppTheme.colors.muted,
    fontSize: 16,
    fontFamily: Fonts.sans,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
  },
  recipeImageWrap: {
    width: 81,
    height: 81,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 16,
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
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  recipeDetail: {
    fontSize: 14,
    color: AppTheme.colors.accentDark,
    fontFamily: Fonts.sans,
    marginTop: 4,
  },
  recipeHint: {
    fontSize: 13,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
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
    fontFamily: Fonts.sans,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    padding: 20,
    ...AppTheme.shadow.floating,
  },
  helpBody: {
    fontSize: 16,
    lineHeight: 24,
    color: AppTheme.colors.text,
    fontFamily: Fonts.rounded,
    marginBottom: 10,
  },
  helpBullet: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.rounded,
    marginBottom: 8,
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
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
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
  modalMeta: {
    fontSize: 14,
    color: AppTheme.colors.accentDark,
    fontFamily: Fonts.sans,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  modalBullet: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
    marginBottom: 8,
  },
});
