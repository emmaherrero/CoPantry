import OpenAI from "npm:openai";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type FoodItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  expiration_date: string | null;
  storage_location: "fridge" | "freezer" | "pantry";
};

type GeneratedRecipe = {
  title: string;
  prep_time: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
};

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!openaiApiKey) {
  throw new Error("Missing OPENAI_API_KEY secret.");
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const openai = new OpenAI({ apiKey: openaiApiKey });

function toExpiringScore(expirationDate: string | null) {
  if (!expirationDate) return Number.POSITIVE_INFINITY;
  const today = new Date();
  const expiration = new Date(expirationDate);
  return expiration.getTime() - today.getTime();
}

function formatItems(items: FoodItem[]) {
  return items
    .sort((a, b) => toExpiringScore(a.expiration_date) - toExpiringScore(b.expiration_date))
    .map((item) => {
      const expirationText = item.expiration_date ?? "unknown";
      return `- ${item.product_name} | quantity: ${item.quantity} ${item.unit} | expiration: ${expirationText} | location: ${item.storage_location}`;
    })
    .join("\n");
}

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function sanitizeRecipe(recipe: GeneratedRecipe) {
  const title = recipe.title?.trim();
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((item) => item.trim()).filter(Boolean)
    : [];
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions.map((item) => item.trim()).filter(Boolean)
    : [];

  if (!title || ingredients.length === 0 || instructions.length === 0) {
    return null;
  }

  return {
    title,
    prep_time: Number.isFinite(recipe.prep_time) ? recipe.prep_time : null,
    servings: Number.isFinite(recipe.servings) ? recipe.servings : null,
    ingredients,
    instructions,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header." }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const householdId = body?.householdId as string | undefined;

    if (!householdId) {
      return new Response(JSON.stringify({ error: "householdId is required." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: items, error: itemsError } = await supabase
      .from("food_items")
      .select("id, product_name, quantity, unit, expiration_date, storage_location")
      .eq("household_id", householdId)
      .order("expiration_date", { ascending: true, nullsFirst: false });

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No pantry items found for this household." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const prompt = `
You are helping college students cook practical meals from the food they already have.

Priorities:
- Prioritize ingredients that expire soon.
- Keep meals simple, realistic, and budget-friendly.
- Prefer recipes that use multiple available ingredients.
- Avoid fancy equipment or hard-to-find ingredients.

Available pantry items:
${formatItems(items as FoodItem[])}

Return JSON only with this shape:
{
  "recipes": [
    {
      "title": "string",
      "prep_time": 15,
      "servings": 2,
      "ingredients": ["string"],
      "instructions": ["string"]
    }
  ]
}

Generate exactly 3 recipes.
Do not include markdown fences or commentary.
`;

    const response = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    const rawText = response.output_text?.trim();

    if (!rawText) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsed = JSON.parse(extractJsonPayload(rawText)) as { recipes?: GeneratedRecipe[] };
    const recipes = Array.isArray(parsed.recipes)
      ? parsed.recipes.map(sanitizeRecipe).filter(Boolean)
      : [];

    if (recipes.length === 0) {
      throw new Error("OpenAI did not return any recipes.");
    }

    const rows = recipes.map((recipe) => ({
      household_id: householdId,
      title: recipe.title,
      ingredients: recipe.ingredients ?? [],
      instructions: recipe.instructions ?? [],
      servings: recipe.servings ?? null,
      prep_time: recipe.prep_time ?? null,
      created_by: user.id,
    }));

    const { data: insertedRecipes, error: insertError } = await supabase
      .from("recipes")
      .insert(rows)
      .select("*");

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        recipes: insertedRecipes,
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
