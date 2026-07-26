export function formatDistance(km: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    return `${(km * 0.621371).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}