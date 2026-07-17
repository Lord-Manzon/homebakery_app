import { supabase } from '../lib/supabase';
import { Expense } from '../types';

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error.message);
    return [];
  }

  return data ?? [];
}

export async function addExpense(
  expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (error) {
    console.error('Error adding expense:', error.message);
    return null;
  }

  return data;
}

export async function updateExpense(
  id: string,
  updates: Partial<Expense>
): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating expense:', error.message);
    return false;
  }

  return true;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error.message);
    return false;
  }

  return true;
}

export async function addIngredientPurchaseExpense(
  expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>,
  ingredientId: string,
  purchasedQuantity: number,
  previousStock: number,
  newStock: number
): Promise<boolean> {
  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (expenseError) {
    console.error('Error adding expense:', expenseError.message);
    return false;
  }

  const { error: stockError } = await supabase
    .from('ingredients')
    .update({ current_stock: newStock })
    .eq('id', ingredientId);

  if (stockError) {
    console.error('Error updating stock:', stockError.message);
    return false;
  }

  const { error: movementError } = await supabase
    .from('inventory_movements')
    .insert({
      ingredient_id: ingredientId,
      movement_type: 'purchase',
      quantity_change: purchasedQuantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_id: expenseData.id,
      notes: `Purchased via expense: ${expense.name}`,
    });

  if (movementError) {
    console.error('Error recording movement:', movementError.message);
    return false;
  }

  return true;
}

export function getExpenseSummary(expenses: Expense[]): {
  today: number;
  thisWeek: number;
  thisMonth: number;
} {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const today = expenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const thisWeek = expenses
    .filter((e) => e.expense_date >= weekStartStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const thisMonth = expenses
    .filter((e) => e.expense_date >= monthStartStr)
    .reduce((sum, e) => sum + e.amount, 0);

  return { today, thisWeek, thisMonth };
}