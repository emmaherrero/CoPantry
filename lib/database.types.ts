export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
      };
      food_items: {
        Row: {
          id: string;
          household_id: string;
          barcode: string | null;
          product_name: string;
          brand: string | null;
          image_url: string | null;
          nutrition_json: Json | null;
          quantity: number;
          unit: string;
          storage_location: "fridge" | "freezer" | "pantry";
          expiration_date: string | null;
          added_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          barcode?: string | null;
          product_name: string;
          brand?: string | null;
          image_url?: string | null;
          nutrition_json?: Json | null;
          quantity?: number;
          unit?: string;
          storage_location?: "fridge" | "freezer" | "pantry";
          expiration_date?: string | null;
          added_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          barcode?: string | null;
          product_name?: string;
          brand?: string | null;
          image_url?: string | null;
          nutrition_json?: Json | null;
          quantity?: number;
          unit?: string;
          storage_location?: "fridge" | "freezer" | "pantry";
          expiration_date?: string | null;
          added_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          ingredients: Json;
          instructions: Json;
          servings: number | null;
          prep_time: number | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          ingredients: Json;
          instructions: Json;
          servings?: number | null;
          prep_time?: number | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          ingredients?: Json;
          instructions?: Json;
          servings?: number | null;
          prep_time?: number | null;
          created_by?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_my_household_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      member_role: "owner" | "member";
      storage_location: "fridge" | "freezer" | "pantry";
    };
  };
};

// Convenience aliases
export type Household = Database["public"]["Tables"]["households"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type HouseholdMember = Database["public"]["Tables"]["household_members"]["Row"];
export type FoodItem = Database["public"]["Tables"]["food_items"]["Row"];
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];

export type InsertFoodItem = Database["public"]["Tables"]["food_items"]["Insert"];
export type UpdateFoodItem = Database["public"]["Tables"]["food_items"]["Update"];
export type InsertRecipe = Database["public"]["Tables"]["recipes"]["Insert"];
export type UpdateRecipe = Database["public"]["Tables"]["recipes"]["Update"];
