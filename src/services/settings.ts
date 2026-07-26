import { supabase } from '../lib/supabase';
import { Settings } from '../types';

export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching settings:', error.message);
    return null;
  }

  return data;
}

export async function updateSettings(
  updates: Partial<Settings>
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .single();

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from('settings')
      .insert({
        business_name: 'My Bakery',
        currency: 'PHP',
        distance_unit: 'km',
        theme: 'system',
        delivery_rate_per_km: 20,
        ...updates,
      });
    return !error;
  }
}