export type Ingredient = {
  id: string;
  name: string;
  category: string | null;
  current_stock: number;
  unit: string;
  low_stock_threshold: number;
  average_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  description: string | null;
  preparation_instructions: string | null;
  yield: number;
  buffer_percent: number;
  markup_percent: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  selling_price: number;
  packaging: string | null;
  packaging_cost: number;
  pieces_per_variant: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  product_id: string;
  ingredient_id: string;
  purchased_quantity: number;
  purchased_unit: string;
  quantity_used: number;
  unit_used: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  customer_name: string;
  order_status: 'active' | 'completed';
  payment_status: 'unpaid' | 'paid';
  is_delivered: boolean;
  production_status: 'pending' | 'completed';
  production_completed_at: string | null;
  order_type: 'delivery' | 'pickup';
  delivery_address: string | null;
  delivery_fee: number;
  delivery_date: string | null;
  delivery_time: string | null;
  customer_notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  expense_type:
    | 'ingredient_purchase'
    | 'packaging'
    | 'transportation'
    | 'utilities'
    | 'equipment'
    | 'miscellaneous';
  name: string;
  amount: number;
  expense_date: string;
  ingredient_id: string | null;
  purchased_quantity: number | null;
  purchased_unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  ingredient_id: string;
  movement_type: 'purchase' | 'production' | 'manual_adjustment';
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

export type Settings = {
  id: string;
  business_name: string;
  business_address: string | null;
  currency: string;
  distance_unit: 'km' | 'miles';
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
};