import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";
import type { Household, Profile, HouseholdMember, FoodItem, Recipe } from "./database.types";

type MemberWithProfile = HouseholdMember & { profiles: Profile };

type HouseholdState = {
  household: Household | null;
  members: MemberWithProfile[];
  foodItems: FoodItem[];
  recipes: Recipe[];
  userProfile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  upsertFoodItem: (item: FoodItem) => void;
  removeFoodItem: (id: string) => void;
};

const HouseholdContext = createContext<HouseholdState>({
  household: null,
  members: [],
  foodItems: [],
  recipes: [],
  userProfile: null,
  loading: true,
  refresh: async () => {},
  upsertFoodItem: () => {},
  removeFoodItem: () => {},
});

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const upsertFoodItem = useCallback((item: FoodItem) => {
    setFoodItems((prev) => [item, ...prev.filter((existing) => existing.id !== item.id)]);
  }, []);

  const removeFoodItem = useCallback((id: string) => {
    setFoodItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    if (!session) return;

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setUserProfile(profile);

    // Fetch user's household membership
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .single();

    if (!membership) {
      setLoading(false);
      return;
    }

    // Fetch household
    const { data: hh } = await supabase
      .from("households")
      .select("*")
      .eq("id", membership.household_id)
      .single();
    setHousehold(hh);

    if (!hh) {
      setLoading(false);
      return;
    }

    // Fetch members with profiles
    const { data: memberData } = await supabase
      .from("household_members")
      .select("*, profiles(*)")
      .eq("household_id", hh.id);
    setMembers((memberData as MemberWithProfile[]) ?? []);

    // Fetch food items
    const { data: items } = await supabase
      .from("food_items")
      .select("*")
      .eq("household_id", hh.id)
      .order("created_at", { ascending: false });
    setFoodItems(items ?? []);

    // Fetch recipes
    const { data: recipeData } = await supabase
      .from("recipes")
      .select("*")
      .eq("household_id", hh.id)
      .order("created_at", { ascending: false });
    setRecipes(recipeData ?? []);

    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime food_items changes
  useEffect(() => {
    if (!household) return;

    const channel = supabase
      .channel("food_items_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_items",
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household, fetchData]);

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        foodItems,
        recipes,
        userProfile,
        loading,
        refresh: fetchData,
        upsertFoodItem,
        removeFoodItem,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return useContext(HouseholdContext);
}
