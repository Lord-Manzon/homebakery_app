import { supabase } from '../lib/supabase';
import { Ingredient } from '../types';

export async function getIngredients(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching ingredients:', error.message);
    return [];
  }

  return data ?? [];
}

export async function addIngredient(
  ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>
): Promise<Ingredient | null> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert(ingredient)
    .select()
    .single();

  if (error) {
    console.error('Error adding ingredient:', JSON.stringify(error));
    return null;
  }

  return data;
}

export async function updateIngredient(
  id: string,
  updates: Partial<Ingredient>
): Promise<boolean> {
  const { error } = await supabase
    .from('ingredients')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating ingredient:', error.message);
    return false;
  }

  return true;
}

export async function deleteIngredient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting ingredient:', error.message);
    return false;
  }

  return true;
}

// Batched lookup: for a list of ingredient IDs, returns how many distinct
// recipes (products) use each one. Used to show "Used in 3 recipes" on the
// Inventory card without firing one query per ingredient.
export async function getIngredientRecipeCounts(
  ingredientIds: string[]
): Promise<Record<string, number>> {
  if (ingredientIds.length === 0) return {};

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('ingredient_id, product_id')
    .in('ingredient_id', ingredientIds);

  if (error) {
    console.error('Error fetching recipe counts:', error.message);
    return {};
  }

  const productsByIngredient: Record<string, Set<string>> = {};
  (data ?? []).forEach((row) => {
    if (!productsByIngredient[row.ingredient_id]) {
      productsByIngredient[row.ingredient_id] = new Set();
    }
    productsByIngredient[row.ingredient_id].add(row.product_id);
  });

  const counts: Record<string, number> = {};
  Object.entries(productsByIngredient).forEach(([ingredientId, productIds]) => {
    counts[ingredientId] = productIds.size;
  });

  return counts;
}

// For the "Used In" popup: returns the distinct product names that use a
// single ingredient. Fetched on-demand when the user taps the recipe count,
// rather than upfront for every ingredient.
export async function getProductsUsingIngredient(
  ingredientId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('products(name)')
    .eq('ingredient_id', ingredientId);

  if (error) {
    console.error('Error fetching products using ingredient:', error.message);
    return [];
  }

  const names = (data ?? [])
    .map((row: any) => row.products?.name)
    .filter((name: string | undefined): name is string => !!name);

  return Array.from(new Set(names));
}

export async function adjustStock(
  id: string,
  newStock: number,
  previousStock: number,
  notes?: string
): Promise<boolean> {
  const { error: stockError } = await supabase
    .from('ingredients')
    .update({ current_stock: newStock })
    .eq('id', id);

  if (stockError) {
    console.error('Error adjusting stock:', stockError.message);
    return false;
  }

  const { error: movementError } = await supabase
    .from('inventory_movements')
    .insert({
      ingredient_id: id,
      movement_type: 'manual_adjustment',
      quantity_change: newStock - previousStock,
      previous_stock: previousStock,
      new_stock: newStock,
      notes: notes ?? null,
    });

  if (movementError) {
    console.error('Error recording movement:', movementError.message);
    return false;
  }

  return true;
}