"use client";

import React from 'react';

export interface PriceFormatterProps {
  amount: number | null | undefined;
  currency?: 'NGN' | 'USD' | 'EUR'; // Add more currencies as needed
  showDecimals?: boolean;
  className?: string;
}

export const PriceFormatter: React.FC<PriceFormatterProps> = ({
  amount,
  currency = 'NGN',
  showDecimals = false,
  className = ''
}) => {
  const formatPrice = (value: number | null | undefined): string => {
    // Handle undefined/null values
    if (value === null || value === undefined || isNaN(value)) {
      return currency === 'NGN' ? '₦0' : '$0';
    }

    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    };

    // Nigeria doesn't use the en-NG locale for Naira formatting in Intl
    // So we'll handle Naira specially
    if (currency === 'NGN') {
      return `₦${value.toLocaleString('en-US', {
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
      })}`;
    }

    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'de-DE', options).format(value);
  };

  return (
    <span className={`whitespace-nowrap ${className}`}>
      {formatPrice(amount)}
    </span>
  );
};