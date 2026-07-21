import { Ingredient, RecipeIngredient } from '../types';

// Converts a quantity between compatible units (weight or volume families).
// Returns null if the two units aren't in the same family — callers should
// fall back to treating quantities as already-matching in that case.
const UNIT_TO_BASE: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  pc: { base: 'pc', factor: 1 },
  pcs: { base: 'pc', factor: 1 },
};

export function convertQuantity(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = UNIT_TO_BASE[fromUnit.toLowerCase()];
  const to = UNIT_TO_BASE[toUnit.toLowerCase()];
  if (!from || !to || from.base !== to.base) return null;
  return (value * from.factor) / to.factor;
}

// Cost of one recipe line: (ingredient's cost for its purchased amount ÷
// purchased quantity) × how much of it this recipe actually uses.
// e.g. Butter bought 440g for ₱196, recipe uses 210.5g →
// (196 / 440) × 210.5 = ₱93.77
export function calculateIngredientCost(
  item: RecipeIngredient,
  ingredient: Ingredient | undefined
): number {
  if (!ingredient || item.purchased_quantity <= 0) return 0;

  const usedInPurchasedUnit =
    item.unit_used === item.purchased_unit
      ? item.quantity_used
      : convertQuantity(item.quantity_used, item.unit_used, item.purchased_unit) ??
        item.quantity_used; // fallback: units didn't match a known family, assume equal

  return (ingredient.average_cost / item.purchased_quantity) * usedInPurchasedUnit;
}

export function calculateRecipeCost(
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[]
): number {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  return recipeIngredients.reduce(
    (sum, item) => sum + calculateIngredientCost(item, byId.get(item.ingredient_id)),
    0
  );
}

export function calculateCostPerPiece(recipeCost: number, yieldCount: number): number {
  if (!yieldCount || yieldCount <= 0) return 0;
  return recipeCost / yieldCount;
}

// Formats a list of prices as a single value ("₱55.00") or a range
// ("₱420.00 – ₱680.00") depending on how many distinct prices exist.
export function formatPriceRange(prices: number[], currency = '₱'): string {
  if (prices.length === 0) return '—';
  const sorted = [...prices].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (low === high) return `${currency}${low.toFixed(2)}`;
  return `${currency}${low.toFixed(2)}–${currency}${high.toFixed(2)}`;
}