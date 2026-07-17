import { supabase } from '../lib/supabase';
import { Product, ProductVariant, RecipeIngredient } from '../types';

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product:', error.message);
    return null;
  }

  return data;
}

export async function addProduct(
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('Error adding product:', error.message);
    return null;
  }

  return data;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating product:', error.message);
    return false;
  }

  return true;
}

export async function archiveProduct(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ is_archived: true })
    .eq('id', id);

  if (error) {
    console.error('Error archiving product:', error.message);
    return false;
  }

  return true;
}

export async function getVariantsByProduct(
  productId: string
): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_archived', false)
    .order('selling_price', { ascending: true });

  if (error) {
    console.error('Error fetching variants:', error.message);
    return [];
  }

  return data ?? [];
}

export async function addVariant(
  variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>
): Promise<ProductVariant | null> {
  const { data, error } = await supabase
    .from('product_variants')
    .insert(variant)
    .select()
    .single();

  if (error) {
    console.error('Error adding variant:', error.message);
    return null;
  }

  return data;
}

export async function updateVariant(
  id: string,
  updates: Partial<ProductVariant>
): Promise<boolean> {
  const { error } = await supabase
    .from('product_variants')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating variant:', error.message);
    return false;
  }

  return true;
}

export async function archiveVariant(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('product_variants')
    .update({ is_archived: true })
    .eq('id', id);

  if (error) {
    console.error('Error archiving variant:', error.message);
    return false;
  }

  return true;
}

export async function deleteVariant(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting variant:', error.message);
    return false;
  }

  return true;
}

export async function getRecipeIngredients(
  productId: string
): Promise<RecipeIngredient[]> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('product_id', productId);

  if (error) {
    console.error('Error fetching recipe:', error.message);
    return [];
  }

  return data ?? [];
}

export async function addRecipeIngredient(
  recipeIngredient: Omit<RecipeIngredient, 'id' | 'created_at' | 'updated_at'>
): Promise<RecipeIngredient | null> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert(recipeIngredient)
    .select()
    .single();

  if (error) {
    console.error('Error adding recipe ingredient:', error.message);
    return null;
  }

  return data;
}

export async function deleteRecipeIngredient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recipe ingredient:', error.message);
    return false;
  }

  return true;
}