export const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('az-AZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return `${formatted} ₼`;
};

export const CURRENCY_SYMBOL = '₼';
export const CURRENCY_CODE = 'AZN'; 