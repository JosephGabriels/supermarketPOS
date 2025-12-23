import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/currency';

interface CurrencyDisplayProps {
  amount: number | string;
  className?: string;
  showSymbol?: boolean;
  showCents?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className = '',
  showSymbol = true,
  showCents = true
}) => {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    const format = async () => {
      try {
        const result = await formatCurrency(amount, showCents);
        setFormatted(showSymbol ? result : result.replace(/^[^\d]+/, '').trim());
      } catch (error) {
        // Fallback formatting
        const val = amount === null || amount === undefined ? 0 : amount;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        const formattedNum = showCents
          ? num.toLocaleString('en-US', { minimumFractionDigits: 2 })
          : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        setFormatted(showSymbol ? `KSh ${formattedNum}` : formattedNum);
      }
    };
    format();
  }, [amount, showSymbol, showCents]);

  return <span className={className}>{formatted}</span>;
};