import { supabase } from '../lib/supabase';

export type FinancialSummary = {
  revenue: number;
  expenses: number;
  netProfit: number;
};

export type ActiveDeliveryLocation = {
  id: string;
  customer_name: string;
  delivery_address: string | null;
  delivery_lat: number;
  delivery_lng: number;
};

export type DashboardStats = {
  today: FinancialSummary;
  week: FinancialSummary;
  month: FinancialSummary;
  activeOrders: number;
  lowStockCount: number;
  productionCount: number;
};

// Returns YYYY-MM-DD string for a given Date
function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRanges() {
  const now = new Date();

  const todayStr = toDateStr(now);

  // Week starts on Sunday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = toDateStr(weekStart);

  // Month starts on the 1st
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = toDateStr(monthStart);

  return { todayStr, weekStartStr, monthStartStr };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { todayStr, weekStartStr, monthStartStr } = getDateRanges();

  // Run all queries in parallel for speed
  const [
    completedOrdersResult,
    expensesResult,
    activeOrdersResult,
    ingredientsResult,
    activeOrderItemsResult,
  ] = await Promise.all([
    // All completed AND paid orders (revenue = money actually received,
    // not just delivered — an unpaid completed order isn't revenue yet)
    supabase
      .from('orders')
      .select('total_amount, delivery_date')
      .eq('order_status', 'completed')
      .eq('payment_status', 'paid'),

    // All expenses
    supabase
      .from('expenses')
      .select('amount, expense_date'),

    // Count of active orders
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('order_status', 'active'),

    // All ingredients (to count low stock)
    supabase
      .from('ingredients')
      .select('current_stock, low_stock_threshold'),

    // Distinct product_ids from active order items
    supabase
      .from('order_items')
      .select('product_id, orders!inner(order_status)')
      .eq('orders.order_status', 'active'),
  ]);

  // --- Revenue (completed orders grouped by delivery_date) ---
  const completedOrders = completedOrdersResult.data ?? [];

  const revenueToday = completedOrders
    .filter((o) => o.delivery_date === todayStr)
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const revenueWeek = completedOrders
    .filter((o) => o.delivery_date != null && o.delivery_date >= weekStartStr)
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const revenueMonth = completedOrders
    .filter((o) => o.delivery_date != null && o.delivery_date >= monthStartStr)
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  // --- Expenses ---
  const expenses = expensesResult.data ?? [];

  const expToday = expenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const expWeek = expenses
    .filter((e) => e.expense_date >= weekStartStr)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const expMonth = expenses
    .filter((e) => e.expense_date >= monthStartStr)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  // --- Quick stats ---
  const activeOrders = activeOrdersResult.count ?? 0;

  const ingredients = ingredientsResult.data ?? [];
  const lowStockCount = ingredients.filter(
    (i) => i.current_stock <= i.low_stock_threshold
  ).length;

  // Count distinct products needed for production
  const activeItems = activeOrderItemsResult.data ?? [];
  const uniqueProductIds = new Set(activeItems.map((item) => item.product_id));
  const productionCount = uniqueProductIds.size;

  return {
    today: {
      revenue: revenueToday,
      expenses: expToday,
      netProfit: revenueToday - expToday,
    },
    week: {
      revenue: revenueWeek,
      expenses: expWeek,
      netProfit: revenueWeek - expWeek,
    },
    month: {
      revenue: revenueMonth,
      expenses: expMonth,
      netProfit: revenueMonth - expMonth,
    },
    activeOrders,
    lowStockCount,
    productionCount,
  };
}
// Today's active (not yet completed) delivery orders that have a
// confirmed pin — used for the dashboard's live delivery map.
export async function getActiveDeliveryLocations(): Promise<ActiveDeliveryLocation[]> {
  const { todayStr } = getDateRanges();

  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, delivery_address, delivery_lat, delivery_lng')
    .eq('order_status', 'active')
    .eq('order_type', 'delivery')
    .eq('delivery_date', todayStr)
    .not('delivery_lat', 'is', null)
    .not('delivery_lng', 'is', null);

  if (error) {
    console.error('Error fetching active delivery locations:', error.message);
    return [];
  }

  return data as ActiveDeliveryLocation[];
}