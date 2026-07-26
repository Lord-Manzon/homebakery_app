const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY!;

export type AddressSuggestion = {
  label: string;
  lat: number;
  lng: number;
};

// Wraps Geoapify's autocomplete endpoint. `bias` nudges results toward the
// bakery's own area so a same-named street elsewhere in the country doesn't
// outrank the correct local match.
export async function autocompleteAddress(
  text: string,
  bias?: { lat: number; lng: number }
): Promise<AddressSuggestion[]> {
  if (!text.trim() || text.trim().length < 3) return [];

  try {
    const params = new URLSearchParams({
      text,
      apiKey: GEOAPIFY_KEY,
      limit: '5',
    });
    if (bias) {
      params.set('bias', `proximity:${bias.lng},${bias.lat}`);
    }
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params}`
    );
    const json = await res.json();
    const features = json?.features ?? [];

    return features.map((f: any) => ({
      label: f.properties.formatted,
      lat: f.properties.lat,
      lng: f.properties.lon,
    }));
  } catch (err) {
    console.error('Autocomplete error:', err);
    return [];
  }
}

// Straight-line distance in km between two points (Haversine formula).
// Pure math — no network call, so this part is free at any volume.
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
export async function reverseGeocodeAddress(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      apiKey: GEOAPIFY_KEY,
    });
    const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`);
    const json = await res.json();
    const feature = json?.features?.[0];
    return feature?.properties?.formatted ?? null;
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}