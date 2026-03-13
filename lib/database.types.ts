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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "food_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "food_items_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
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
    CompositeTypes: {
      [_ in never]: never;
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
