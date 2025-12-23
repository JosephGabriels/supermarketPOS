import React from 'react';

interface SaleLinkProps {
  saleId: number;
  saleNumber: string;
  className?: string;
}

export const SaleLink: React.FC<SaleLinkProps> = ({ saleId, saleNumber, className = '' }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'sales');
    url.searchParams.set('saleId', saleId.toString());
    window.history.pushState({}, '', url.toString());
    
    // Dispatch popstate event so App.tsx detects the change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a 
      href={`?page=sales&saleId=${saleId}`}
      onClick={handleClick}
      className={`text-blue-500 hover:text-blue-600 hover:underline cursor-pointer ${className}`}
    >
      {saleNumber}
    </a>
  );
};
