import { supabase } from '../lib/supabase';
import { Order, OrderItem } from '../types';

export async function getOrders(
  status: 'active' | 'completed' | 'cancelled'
): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_status', status)
    .order('delivery_date', { ascending: true })
    .order('delivery_time', { ascending: true });

  if (error) {
    console.error('Error fetching orders:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching order:', error.message);
    return null;
  }

  return data;
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (error) {
    console.error('Error fetching order items:', error.message);
    return [];
  }

  return data ?? [];
}

export async function createOrder(
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>,
  items: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>[]
): Promise<Order | null> {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order:', orderError.message);
    return null;
  }

  const orderItems = items.map((item) => ({
    ...item,
    order_id: orderData.id,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Error creating order items:', itemsError.message);
    return null;
  }

  return orderData;
}

export async function updateOrderStatus(
  id: string,
  status: 'active' | 'completed' | 'cancelled'
): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ order_status: status })
    .eq('id', id);

  if (error) {
    console.error('Error updating order status:', error.message);
    return false;
  }

  return true;
}

export async function updatePaymentStatus(
  id: string,
  status: 'paid' | 'unpaid'
): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', id);

  if (error) {
    console.error('Error updating payment status:', error.message);
    return false;
  }

  return true;
}

export async function updateOrder(
  id: string,
  updates: Partial<Order>
): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating order:', error.message);
    return false;
  }

  return true;
}

// Updates an order's details AND replaces all its order items in one operation.
// Used by Edit Order — deletes existing items and re-inserts the new set,
// which is simpler and safer than diffing individual item changes.
export async function updateOrderWithItems(
  id: string,
  orderUpdates: Partial<Order>,
  items: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>[]
): Promise<boolean> {
  const { error: orderError } = await supabase
    .from('orders')
    .update(orderUpdates)
    .eq('id', id);

  if (orderError) {
    console.error('Error updating order:', orderError.message);
    return false;
  }

  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', id);

  if (deleteError) {
    console.error('Error clearing old order items:', deleteError.message);
    return false;
  }

  const newItems = items.map((item) => ({ ...item, order_id: id }));

  const { error: insertError } = await supabase
    .from('order_items')
    .insert(newItems);

  if (insertError) {
    console.error('Error inserting updated order items:', insertError.message);
    return false;
  }

  return true;
}

export async function getOrderItemsSummary(
  orderIds: string[]
): Promise<Record<string, string>> {
  if (orderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('order_items')
    .select('order_id, quantity, products(name), product_variants(name)')
    .in('order_id', orderIds);

  if (error) {
    console.error('Error fetching order items summary:', error.message);
    return {};
  }

  const grouped: Record<string, string[]> = {};
  (data ?? []).forEach((item: any) => {
    const productName = item.products?.name ?? 'Unknown';
    const variantName = item.product_variants?.name ?? '';
    const line = `${item.quantity}× ${variantName} · ${productName}`;
    if (!grouped[item.order_id]) grouped[item.order_id] = [];
    grouped[item.order_id].push(line);
  });

  const summary: Record<string, string> = {};
  Object.entries(grouped).forEach(([orderId, lines]) => {
    summary[orderId] =
      lines.length > 1 ? `${lines[0]} +${lines.length - 1} more` : lines[0];
  });

  return summary;
}

export function groupOrdersByDate(orders: Order[]): {
  date: string;
  label: string;
  orders: Order[];
}[] {
  const groups: Record<string, Order[]> = {};

  orders.forEach((order) => {
    const key = order.delivery_date ?? 'No Date';
    if (!groups[key]) groups[key] = [];
    groups[key].push(order);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, orders]) => ({
      date,
      label: formatDateLabel(date),
      orders,
    }));
}

function formatDateLabel(dateStr: string): string {
  if (dateStr === 'No Date') return 'No Date Set';

  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}