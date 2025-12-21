import systemConfigApi from '../services/systemConfigApi';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  KES: 'KSh',
  EUR: '€',
  JPY: '¥',
  // Add more as needed
};

let cachedCurrency: string | null = null;
let cachedSymbol: string | null = null;

/**
 * Get the current currency symbol from system config
 */
export async function getCurrencySymbol(): Promise<string> {
  if (cachedSymbol) {
    return cachedSymbol;
  }

  try {
    const config = await systemConfigApi.getSystemConfig('default_currency');
    const currency = config?.value || 'KES'; // Default to KES as per user request
    cachedCurrency = currency;
    cachedSymbol = CURRENCY_SYMBOLS[currency] || currency;
    return cachedSymbol;
  } catch (error) {
    console.error('Failed to get currency symbol:', error);
    return 'KSh'; // Fallback
  }
}

/**
 * Get the current currency code
 */
export async function getCurrencyCode(): Promise<string> {
  if (cachedCurrency) {
    return cachedCurrency;
  }

  try {
    const config = await systemConfigApi.getSystemConfig('default_currency');
    const currency = config?.value || 'KES';
    cachedCurrency = currency;
    cachedSymbol = CURRENCY_SYMBOLS[currency] || currency;
    return currency;
  } catch (error) {
    console.error('Failed to get currency code:', error);
    return 'KES';
  }
}

/**
 * Format a number as currency
 */
export async function formatCurrency(amount: number | string, showCents: boolean = true): Promise<string> {
  const symbol = await getCurrencySymbol();
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (showCents) {
    return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  } else {
    return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Clear cached currency data (useful when settings change)
 */
export function clearCurrencyCache(): void {
  cachedCurrency = null;
  cachedSymbol = null;
}