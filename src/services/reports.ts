import { supabase } from '../lib/supabase';

export type DayIndicator = {
  date: string; // YYYY-MM-DD
  hasProfit: boolean;
  hasLoss: boolean;
  hasDeliveries: boolean;
};

export type PeriodSummary = {
  revenue: number;
  expenses: number;
  netProfit: number;
  ordersDelivered: number;
  productsSold: number;
  averageOrderValue: number;
};

export type ProductPerformance = {
  productId: string;
  productName: string;
  variantName: string;
  totalQuantity: number;
  totalRevenue: number;
};

// Returns YYYY-MM-DD string
function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'custom', customStart?: string, customEnd?: string): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();

  if (period === 'today') {
    const today = toDateStr(now);
    return { startDate: today, endDate: today };
  }

  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return { startDate: toDateStr(weekStart), endDate: toDateStr(now) };
  }

  if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toDateStr(monthStart), endDate: toDateStr(now) };
  }

  // custom
  return {
    startDate: customStart ?? toDateStr(now),
    endDate: customEnd ?? toDateStr(now),
  };
}

// Fetches all day indicators for a given month (for the calendar dots)
export async function getMonthIndicators(
  year: number,
  month: number // 1-12
): Promise<Record<string, DayIndicator>> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const [ordersResult, expensesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('delivery_date, total_amount, order_status, payment_status')
      .gte('delivery_date', monthStart)
      .lte('delivery_date', monthEnd),

    supabase
      .from('expenses')
      .select('expense_date, amount')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd),
  ]);

  const orders = ordersResult.data ?? [];
  const expenses = expensesResult.data ?? [];

  // Build a map of date -> { revenue, expenses, deliveries }
  const dayMap: Record<string, { revenue: number; expenses: number; deliveries: number }> = {};

  orders.forEach((o) => {
    if (!o.delivery_date) return;
    if (!dayMap[o.delivery_date]) dayMap[o.delivery_date] = { revenue: 0, expenses: 0, deliveries: 0 };
    if (o.order_status === 'completed') {
      // Deliveries count every completed order — delivery is an operational
      // fact independent of whether payment was collected yet.
      dayMap[o.delivery_date].deliveries += 1;
      // Revenue only counts orders that have actually been paid.
      if (o.payment_status === 'paid') {
        dayMap[o.delivery_date].revenue += o.total_amount ?? 0;
      }
    }
  });

  expenses.forEach((e) => {
    if (!dayMap[e.expense_date]) dayMap[e.expense_date] = { revenue: 0, expenses: 0, deliveries: 0 };
    dayMap[e.expense_date].expenses += e.amount ?? 0;
  });

  // Convert to DayIndicator format
  const indicators: Record<string, DayIndicator> = {};
  Object.entries(dayMap).forEach(([date, data]) => {
    const netProfit = data.revenue - data.expenses;
    indicators[date] = {
      date,
      hasProfit: netProfit > 0,
      hasLoss: netProfit < 0,
      hasDeliveries: data.deliveries > 0,
    };
  });

  return indicators;
}

// Fetches summary stats for a date range
export async function getPeriodSummary(
  startDate: string,
  endDate: string
): Promise<PeriodSummary> {
  const [ordersResult, expensesResult, itemsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, order_status, payment_status')
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate)
      .eq('order_status', 'completed'),

    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate),

    supabase
      .from('order_items')
      .select('quantity, subtotal, orders!inner(delivery_date, order_status)')
      .gte('orders.delivery_date', startDate)
      .lte('orders.delivery_date', endDate)
      .eq('orders.order_status', 'completed'),
  ]);

  const orders = ordersResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const items = itemsResult.data ?? [];

  // Orders Delivered is operational — every completed order counts,
  // paid or not. Revenue is financial — only paid orders count toward it.
  const ordersDelivered = orders.length;
  const revenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const productsSold = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  const averageOrderValue = ordersDelivered > 0 ? revenue / ordersDelivered : 0;

  return {
    revenue,
    expenses: totalExpenses,
    netProfit: revenue - totalExpenses,
    ordersDelivered,
    productsSold,
    averageOrderValue,
  };
}

// Fetches best selling products for a date range
export async function getProductPerformance(
  startDate: string,
  endDate: string
): Promise<ProductPerformance[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      subtotal,
      products(name),
      product_variants(name),
      orders!inner(delivery_date, order_status, payment_status)
    `)
    .gte('orders.delivery_date', startDate)
    .lte('orders.delivery_date', endDate)
    .eq('orders.order_status', 'completed');

  if (error) {
    console.error('Error fetching product performance:', error.message);
    return [];
  }

  // Aggregate by product + variant
  const map: Record<string, ProductPerformance> = {};

  (data ?? []).forEach((item: any) => {
    const productName = item.products?.name ?? 'Unknown';
    const variantName = item.product_variants?.name ?? '';
    const key = `${productName}__${variantName}`;

    if (!map[key]) {
      map[key] = {
        productId: item.product_id,
        productName,
        variantName,
        totalQuantity: 0,
        totalRevenue: 0,
      };
    }

    // Quantity sold is operational — every completed order counts.
    map[key].totalQuantity += item.quantity ?? 0;
    // Revenue is financial — only count it once the order is actually paid.
    if (item.orders?.payment_status === 'paid') {
      map[key].totalRevenue += item.subtotal ?? 0;
    }
  });

  // Sort by quantity sold descending
  return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity);
}