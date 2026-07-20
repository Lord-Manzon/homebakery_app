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

// Batch version — fetches recipe ingredients for many products in one query,
// used by the product list screen to compute cost/price/profit per card
// without firing one request per product.
export async function getRecipeIngredientsForProducts(
  productIds: string[]
): Promise<RecipeIngredient[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('product_id', productIds);

  if (error) {
    console.error('Error fetching recipe ingredients (batch):', error.message);
    return [];
  }

  return data ?? [];
}

// Batch version of getVariantsByProduct, same reasoning as above.
export async function getVariantsForProducts(
  productIds: string[]
): Promise<ProductVariant[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', productIds)
    .eq('is_archived', false)
    .order('selling_price', { ascending: true });

  if (error) {
    console.error('Error fetching variants (batch):', error.message);
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

// Uploads a locally-picked photo (from expo-image-picker) to the
// `product-images` bucket and returns its public URL, or null on failure.
export async function uploadProductImage(
  productId: string,
  localUri: string,
  knownMimeType?: string | null
): Promise<string | null> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    // Trust the picker's reported mimeType first (most reliable), then the
    // blob's own type as a fallback, then default to jpeg as a last resort.
    // We deliberately do NOT parse the file extension from the URI — on web,
    // expo-image-picker returns a blob: URL with no real extension, which
    // was producing an invalid Content-Type header.
    const resolvedType = knownMimeType || blob.type || 'image/jpeg';
    const extension = resolvedType.split('/')[1]?.split('+')[0] || 'jpg';
    const path = `${productId}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, arrayBuffer, {
        contentType: resolvedType,
        upsert: true,
      });

    if (error) {
      console.error('Error uploading product image:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading product image:', err);
    return null;
  }
}