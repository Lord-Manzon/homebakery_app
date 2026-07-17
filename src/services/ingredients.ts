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