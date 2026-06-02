export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr.',  name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar' },
  { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł',   name: 'Polish Złoty' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira' },
];

/** Format a fiat amount using the browser's locale. */
export function formatFiat(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: ['JPY', 'KRW'].includes(currency) ? 0 : 2,
    maximumFractionDigits: ['JPY', 'KRW'].includes(currency) ? 0 : 2,
  }).format(amount);
}

/** Convert satoshis to fiat given a BTC price. */
export function satsToFiat(sats: number, btcPrice: number): number {
  return (sats / 1e8) * btcPrice;
}
