import type { FoodItem, InsertRecipe } from "./database.types";

type GeneratedRecipe = {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings: number | null;
  prepTime: number | null;
};

type ExpirationEstimate = {
  expirationDate: string;
  shelfLifeDays: number | null;
  confidence: "low" | "medium" | "high";
  reasoning: string;
};

const OPENAI_ENV_NAMES = [
  "EXPO_PUBLIC_OPENAI_API_KEY",
  "OPENAI_API_KEY",
] as const;

function normalizeEnvValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, " ").trim();
}

export function getOpenAIKey() {
  for (const envName of OPENAI_ENV_NAMES) {
    const value = normalizeEnvValue(process.env[envName]);

    if (value) {
      return value;
    }
  }

  return null;
}

function cleanJsonPayload(payload: string) {
  const trimmed = payload.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function clampPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseRecipesPayload(payload: string): GeneratedRecipe[] {
  const parsed = JSON.parse(cleanJsonPayload(payload)) as {
    recipes?: unknown;
  };

  if (!Array.isArray(parsed.recipes)) {
    throw new Error("OpenAI returned an invalid recipe format.");
  }

  const recipes = parsed.recipes
    .map((recipe) => {
      if (!recipe || typeof recipe !== "object") {
        return null;
      }

      const candidate = recipe as Record<string, unknown>;
      const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
      const ingredients = normalizeStringArray(candidate.ingredients);
      const instructions = normalizeStringArray(candidate.instructions);

      if (!title || ingredients.length === 0 || instructions.length === 0) {
        return null;
      }

      return {
        title,
        ingredients,
        instructions,
        servings: clampPositiveInteger(candidate.servings),
        prepTime: clampPositiveInteger(candidate.prepTime),
      };
    })
    .filter((recipe): recipe is GeneratedRecipe => recipe !== null);

  if (recipes.length === 0) {
    throw new Error("OpenAI did not return any usable recipes.");
  }

  return recipes;
}

function parseExpirationEstimatePayload(payload: string): ExpirationEstimate {
  const parsed = JSON.parse(cleanJsonPayload(payload)) as Record<string, unknown>;
  const expirationDate =
    typeof parsed.expirationDate === "string" ? parsed.expirationDate.trim() : "";
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "";
  const confidence =
    parsed.confidence === "low" || parsed.confidence === "medium" || parsed.confidence === "high"
      ? parsed.confidence
      : "low";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
    throw new Error("OpenAI returned an invalid expiration date.");
  }

  return {
    expirationDate,
    shelfLifeDays: clampPositiveInteger(parsed.shelfLifeDays),
    confidence,
    reasoning,
  };
}

async function extractOpenAIError(response: Response) {
  try {
    const payload = await response.json();
    const message = payload?.error?.message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  } catch {
    return `OpenAI request failed with status ${response.status}.`;
  }

  return `OpenAI request failed with status ${response.status}.`;
}

export async function generateRecipesFromPantry(foodItems: FoodItem[]) {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Add EXPO_PUBLIC_OPENAI_API_KEY to your local .env file.");
  }

  if (foodItems.length === 0) {
    throw new Error("Add a few pantry items before generating recipes.");
  }

  const pantrySummary = foodItems
    .slice(0, 40)
    .map((item) => {
      const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;
      const brand = item.brand?.trim() ? `, brand: ${item.brand.trim()}` : "";
      const expiration = item.expiration_date ? `, expires: ${item.expiration_date}` : "";
      return `- ${item.product_name} (${quantity} ${item.unit}, ${item.storage_location}${brand}${expiration})`;
    })
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You create realistic home recipes from pantry inventory. Return only valid JSON with a top-level recipes array.",
        },
        {
          role: "user",
          content: [
            "Use the pantry inventory below to create 3 practical recipes.",
            "Favor ingredients already on hand, but you may add a few common staples when needed.",
            'Return only JSON in this shape: {"recipes":[{"title":"string","ingredients":["string"],"instructions":["string"],"servings":number,"prepTime":number}]}',
            "Each recipe needs a short title, 4-8 ingredient lines, and 3-6 instruction steps.",
            "",
            "Pantry inventory:",
            pantrySummary,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await extractOpenAIError(response));
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseRecipesPayload(content);
}

export async function estimateExpirationDate(params: {
  productName: string;
  brand?: string | null;
  storageLocation: FoodItem["storage_location"];
  purchaseDate: string;
  itemCategory?: "general" | "meat" | "poultry";
  quantity?: number | null;
  unit?: string | null;
}) {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error(
      "Missing OpenAI API key. Add EXPO_PUBLIC_OPENAI_API_KEY to your local .env file.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You estimate household food expiration dates.",
            "Use common food safety guidance and ordinary US grocery assumptions.",
            "Assume the item is unopened unless the user says otherwise.",
            "Return only valid JSON.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            'Return JSON in this shape: {"expirationDate":"YYYY-MM-DD","shelfLifeDays":number,"confidence":"low|medium|high","reasoning":"short string"}',
            `Product: ${params.productName}`,
            `Brand: ${params.brand?.trim() || "unknown"}`,
            `Category: ${params.itemCategory ?? "general"}`,
            `Amount: ${params.quantity ?? "unknown"} ${params.unit ?? "unit"}`,
            `Storage location: ${params.storageLocation}`,
            `Purchase date: ${params.purchaseDate}`,
            "Estimate a practical expiration date based on when a normal household should use it by.",
            "For meat and poultry, lean conservative and food-safe.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await extractOpenAIError(response));
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseExpirationEstimatePayload(content);
}

export function toRecipeInsert(
  recipe: GeneratedRecipe,
  householdId: string,
  userId: string
): InsertRecipe {
  return {
    household_id: householdId,
    title: recipe.title,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    servings: recipe.servings,
    prep_time: recipe.prepTime,
    created_by: userId,
  };
}
