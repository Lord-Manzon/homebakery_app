import { supabase } from '../lib/supabase';
import { Settings } from '../types';

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY!;

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

// Geocodes a plain address string into { lat, lng } using Geoapify.
// Returns null if the address can't be resolved (caller decides how to handle that).
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;

  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      address
    )}&limit=1&apiKey=${GEOAPIFY_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const feature = json?.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

export async function updateSettings(
  updates: Partial<Settings>
): Promise<boolean> {
  // If the business address changed, re-geocode it so origin_lat/lng stay in sync.
  if (updates.business_address) {
    const coords = await geocodeAddress(updates.business_address);
    if (coords) {
      updates.origin_lat = coords.lat;
      updates.origin_lng = coords.lng;
    }
  }

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