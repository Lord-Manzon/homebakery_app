// Maps a Settings currency code to its display symbol/prefix. Falls back to
// the raw code + a space for any custom code a user typed in Settings that
// isn't in this list (e.g. "THB 480.00" instead of a made-up symbol).
const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  MYR: 'RM',
  JPY: '¥',
  AUD: 'A$',
  GBP: '£',
};

export function getCurrencyPrefix(code: string | null | undefined): string {
  if (!code) return '₱';
  const known = CURRENCY_SYMBOLS[code.toUpperCase()];
  if (known) return known;
  return `${code} `;
}