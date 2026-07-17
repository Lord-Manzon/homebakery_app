import { supabase } from '../lib/supabase';
import { getIngredients } from './ingredients';
import { getOrderItems, getOrders } from './orders';
import { getRecipeIngredients } from './products';

export type ProductionItem = {
  product_id: string;
  product_name: string;
  variants: {
    variant_id: string;
    variant_name: string;
    quantity: number;
  }[];
  total_quantity: number;
};

export type IngredientRequirement = {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  required: number;
  available: number;
  sufficient: boolean;
  shortage: number;
};

export type ProductionSummary = {
  productionItems: ProductionItem[];
  ingredientRequirements: IngredientRequirement[];
  totalProducts: number;
  totalItems: number;
  missingIngredients: number;
};

export async function getProductionSummary(
  products: { id: string; name: string }[],
  variants: { id: string; name: string; product_id: string }[]
): Promise<ProductionSummary> {
  // Get all active orders and their items
  const activeOrders = await getOrders('active');
  if (activeOrders.length === 0) {
    return {
      productionItems: [],
      ingredientRequirements: [],
      totalProducts: 0,
      totalItems: 0,
      missingIngredients: 0,
    };
  }

  const allOrderItems = await Promise.all(
    activeOrders.map((order) => getOrderItems(order.id))
  );
  const flatItems = allOrderItems.flat();

  // Group by product and variant
  const productMap: Record<string, ProductionItem> = {};

  flatItems.forEach((item) => {
    const product = products.find((p) => p.id === item.product_id);
    const variant = variants.find((v) => v.id === item.variant_id);
    if (!product || !variant) return;

    if (!productMap[item.product_id]) {
      productMap[item.product_id] = {
        product_id: item.product_id,
        product_name: product.name,
        variants: [],
        total_quantity: 0,
      };
    }

    const existing = productMap[item.product_id].variants.find(
      (v) => v.variant_id === item.variant_id
    );

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      productMap[item.product_id].variants.push({
        variant_id: item.variant_id,
        variant_name: variant.name,
        quantity: item.quantity,
      });
    }

    productMap[item.product_id].total_quantity += item.quantity;
  });

  const productionItems = Object.values(productMap);

  // Calculate ingredient requirements
  const ingredients = await getIngredients();
  const ingredientMap: Record<string, number> = {};

  for (const productionItem of productionItems) {
    const recipeIngredients = await getRecipeIngredients(
      productionItem.product_id
    );

    recipeIngredients.forEach((ri) => {
      const multiplier = productionItem.total_quantity;
      const amountNeeded = ri.quantity_used * multiplier;

      if (!ingredientMap[ri.ingredient_id]) {
        ingredientMap[ri.ingredient_id] = 0;
      }
      ingredientMap[ri.ingredient_id] += amountNeeded;
    });
  }

  const ingredientRequirements: IngredientRequirement[] = Object.entries(
    ingredientMap
  ).map(([ingredientId, required]) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    const available = ingredient?.current_stock ?? 0;
    const sufficient = available >= required;
    const shortage = sufficient ? 0 : required - available;

    return {
      ingredient_id: ingredientId,
      ingredient_name: ingredient?.name ?? 'Unknown',
      unit: ingredient?.unit ?? '',
      required,
      available,
      sufficient,
      shortage,
    };
  });

  const missingIngredients = ingredientRequirements.filter(
    (r) => !r.sufficient
  ).length;

  return {
    productionItems,
    ingredientRequirements,
    totalProducts: productionItems.length,
    totalItems: flatItems.reduce((sum, item) => sum + item.quantity, 0),
    missingIngredients,
  };
}

export async function completeProduction(
  ingredientRequirements: IngredientRequirement[]
): Promise<boolean> {
  for (const req of ingredientRequirements) {
    const { data: ingredient, error: fetchError } = await supabase
      .from('ingredients')
      .select('current_stock')
      .eq('id', req.ingredient_id)
      .single();

    if (fetchError || !ingredient) continue;

    const previousStock = ingredient.current_stock;
    const newStock = Math.max(0, previousStock - req.required);

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ current_stock: newStock })
      .eq('id', req.ingredient_id);

    if (updateError) {
      console.error('Error updating stock:', updateError.message);
      return false;
    }

    await supabase.from('inventory_movements').insert({
      ingredient_id: req.ingredient_id,
      movement_type: 'production',
      quantity_change: -(req.required),
      previous_stock: previousStock,
      new_stock: newStock,
      notes: 'Deducted from production',
    });
  }

  return true;
}