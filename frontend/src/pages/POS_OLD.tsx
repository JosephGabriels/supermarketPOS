import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search, 
  User, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Calculator,
  X,
  Check,
  AlertCircle,
  Receipt,
  Tag,
  Percent,
  Star
} from 'lucide-react';
import { productsApi } from '../services/productsApi';
import { customersApi } from '../services/customersApi';
import { salesApi } from '../services/salesApi';
import { discountsApi } from '../services/salesApi';
import { shiftsApi } from '../services/shiftsApi';
import { paymentsApi } from '../services/paymentsApi';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface POSProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

interface CartItem {
  product: any;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

interface Payment {
  method: 'cash' | 'mpesa' | 'card';
  amount: number;
}

interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  valid: boolean;
}

interface LastSale {
  id: number;
  sale_number?: string;
  subtotal: string;
  tax_amount?: string;
  total_amount: string;
  items?: Array<{
    product_barcode?: string;
    product?: number;
    product_name?: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
  }>;
  etims_qr_image?: string;
  rcpt_signature?: string;
  cashier_name?: string;
  payments: Payment[];
  change: number;
  discountAmount: number;
  pointsDiscount: number;
  tax: number;
  saleDate: string;
  posNumber: number;
  cashierName: string;
}

const numberToWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

  if (num === 0) return 'ZERO';

  const parts: string[] = [];
  let scaleIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      let chunkWords = '';
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;
      const tensPlace = Math.floor(remainder / 10);
      const onesPlace = remainder % 10;

      if (hundreds > 0) {
        chunkWords += ones[hundreds] + ' HUNDRED ';
      }

      if (remainder >= 20) {
        chunkWords += tens[tensPlace];
        if (onesPlace > 0) {
          chunkWords += ' ' + ones[onesPlace];
        }
      } else if (remainder >= 10) {
        chunkWords += teens[remainder - 10];
      } else if (onesPlace > 0) {
        chunkWords += ones[onesPlace];
      }

      if (scaleIndex > 0) {
        chunkWords += ' ' + scales[scaleIndex];
      }

      parts.unshift(chunkWords.trim());
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  return parts.join(' ').trim();
};

export const POS: React.FC<POSProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // Load products and customers
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsRes, customersRes] = await Promise.all([
          productsApi.getProducts(),
          customersApi.getCustomers()
        ]);
        console.log('Raw productsRes:', productsRes);
        console.log('Raw customersRes:', customersRes);

        // Normalize possible response shapes from API wrappers
        const normalizeList = (res: any) => {
          if (!res) return [];
          // If it's already an array, return it
          if (Array.isArray(res)) return res;
          // If it has results property (DRF pagination), use that
          if (res.results && Array.isArray(res.results)) return res.results;
          // If it has data property (our transformed response), use that
          if (res.data) {
            if (Array.isArray(res.data)) return res.data;
            if (res.data.results && Array.isArray(res.data.results)) return res.data.results;
            if (Array.isArray(res.data.data)) return res.data.data;
          }
          return [];
        };

        const normalizedProducts = normalizeList(productsRes);
        const normalizedCustomers = normalizeList(customersRes);
        console.log('Normalized products:', normalizedProducts);
        console.log('Normalized customers:', normalizedCustomers);

        setProducts(normalizedProducts);
        setCustomers(normalizedCustomers);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Check for open shift and load it, or prompt to open one
  useEffect(() => {
    const checkShift = async () => {
      try {
        setShiftLoading(true);
        console.log('[POS] Checking for current shift...');
        
        // Try to get current open shift
        try {
          const shift = await shiftsApi.getCurrentShift();
          console.log('[POS] Current shift found:', shift);
          setCurrentShift(shift);
        } catch (err: any) {
          // No open shift found, need to open one
          console.log('[POS] No open shift, prompting to open shift');
          setCurrentShift(null);
          setShowShiftModal(true);
        }
      } catch (err) {
        console.error('[POS] Error checking shift:', err);
        setError('Error checking shift status');
      } finally {
        setShiftLoading(false);
      }
    };

    // Only check shift if user is logged in
    if (user) {
      checkShift();
    }
  }, [user]);

  // Handle closing the current shift
  const handleCloseShift = async () => {
    if (!currentShift) return;
    
    try {
      setProcessing(true);
      console.log('[POS] Closing shift:', currentShift.id);
      
      const closingCash = (document.getElementById('closingCash') as HTMLInputElement)?.value || '0.00';
      const notes = (document.getElementById('closeShiftNotes') as HTMLTextAreaElement)?.value || '';
      
      const shift = await shiftsApi.closeShift(currentShift.id, closingCash, notes);
      console.log('[POS] Shift closed successfully:', shift);
      
      setCurrentShift(null);
      setShowCloseShiftModal(false);
      setError(null);
      
      // Optionally show a success message or redirect
      alert('Shift closed successfully!');
    } catch (err: any) {
      console.error('[POS] Error closing shift:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to close shift');
      }
    } finally {
      setProcessing(false);
    }
  };



  // Update loyalty points when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setLoyaltyPoints(selectedCustomer.total_points || 0);
      setPointsToRedeem(0);
    } else {
      setLoyaltyPoints(0);
      setPointsToRedeem(0);
    }
  }, [selectedCustomer]);

  // Add product to cart by barcode
  const addProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;
    console.log('addProductByBarcode called with:', barcode);
    
    try {
      const productRes = await productsApi.lookupByBarcode(barcode);
      console.log('Barcode lookup result:', productRes);
      
      // Normalize single-product response
      let product = productRes;
      
      // Validate product is an object
      if (!product || typeof product !== 'object') {
        throw new Error('Invalid product response');
      }
      
      console.log('Normalized product from barcode:', product);
      
      // Validate product has required fields
      if (!product || !product.id) {
        throw new Error('Invalid product data');
      }
      
      addToCart(product);
      setBarcodeInput('');
      setError(null);
    } catch (err) {
      console.error('addProductByBarcode error:', err);
      setError('Product not found');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Add product to cart
  const addToCart = (product: any) => {
    console.log('addToCart called with:', product);

    // Extract product fields - the API should return consistent field names
    const productId = product?.id;
    const productName = product?.name || 'Unknown';
    const productPrice = product?.price || '0';
    const productStock = product?.stock_quantity || 0;

    // Validate required fields
    if (!productId) {
      setError('Invalid product: missing ID');
      setTimeout(() => setError(null), 3000);
      return;
    }

    console.log('Product fields:', { productId, productName, productPrice, productStock });

    // Check stock availability
    if ((productStock || 0) <= 0) {
      setError(`${productName} is out of stock`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const existingItem = cart.find(item => item.product.id === productId);
    console.log('Existing item in cart:', existingItem);

    const unitPrice = Number(productPrice) || 0;
    console.log('Unit price:', unitPrice);

    if (existingItem) {
      if (existingItem.quantity >= productStock) {
        setError(`Only ${productStock} units available`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      setCart(cart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product: { id: productId, name: productName, stock_quantity: productStock, raw: product },
        quantity: 1,
        unitPrice: unitPrice,
        discount: 0,
        subtotal: unitPrice
      };
      console.log('Adding new item to cart:', newItem);
      setCart([...cart, newItem]);
      console.log('Cart after add:', [...cart, newItem]);
    }
  };

  // Update cart item quantity
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const item = cart.find(item => item.product.id === productId);
    if (item && quantity > item.product.stock_quantity) {
      setError(`Only ${item.product.stock_quantity} units available`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity, subtotal: quantity * item.unitPrice }
        : item
    ));
  };

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? subtotal * (appliedDiscount.value / 100)
      : appliedDiscount.value
    : 0;
  
  // Loyalty points redemption (1 point = KES 0.1)
  const pointsDiscount = pointsToRedeem * 0.1;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount - pointsDiscount);
  const tax = discountedSubtotal * 0.16; // 16% VAT
  const total = discountedSubtotal; // Prices are tax-inclusive, total is discounted subtotal

  // Apply discount code
  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;
    
    try {
      const discount = await discountsApi.validateCode(discountCode);
      setAppliedDiscount({
        code: discountCode,
        type: discount.discount_type,
        value: parseFloat(discount.value),
        valid: true
      });
      setError(null);
    } catch (err) {
      setError('Invalid discount code');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Remove discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  // Add payment
  const addPayment = (method: 'cash' | 'mpesa' | 'card', amount?: number) => {
    if (method === 'cash' && amount) {
      // Quick cash amounts
      const existingPayment = payments.find(p => p.method === 'cash');
      if (existingPayment) {
        setPayments(payments.map(p => 
          p.method === 'cash' ? { ...p, amount: p.amount + amount } : p
        ));
      } else {
        setPayments([...payments, { method, amount }]);
      }
    } else {
      // For M-Pesa and Card, add the remaining amount needed
      const paymentAmount = total - totalPaid;
      if (paymentAmount > 0) {
        const existingPayment = payments.find(p => p.method === method);
        if (existingPayment) {
          setPayments(payments.map(p => 
            p.method === method ? { ...p, amount: p.amount + paymentAmount } : p
          ));
        } else {
          setPayments([...payments, { method, amount: paymentAmount }]);
        }
      }
    }
  };

  // Remove payment
  const removePayment = (method: 'cash' | 'mpesa' | 'card') => {
    setPayments(payments.filter(p => p.method !== method));
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const change = totalPaid - total;
  
  // Debug logging
  console.log('Sale validation:', {
    cartLength: cart.length,
    totalPaid,
    total,
    canComplete: cart.length > 0 && totalPaid >= total && !processing
  });

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (totalPaid < total) {
      setError('Insufficient payment');
      return;
    }

    // Check if shift is open - temporarily disabled due to backend issues
    // if (!currentShift) {
    //   setError('No open shift. Please open a shift first.');
    //   setShowShiftModal(true);
    //   return;
    // }

    try {
      setProcessing(true);
      setError(null);

      // Create sale
      const saleData = {
        customer_id: selectedCustomer?.id,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unitPrice.toString(),
          discount: item.discount.toString()
        })),
        discount_amount: discountAmount.toString(),
        points_discount: pointsDiscount.toString(),
        discount_code: appliedDiscount?.code || '',
        notes: `Loyalty points redeemed: ${pointsToRedeem}`
      };

      const sale = await salesApi.createSale(saleData);

      // Create payments
      for (const payment of payments) {
        await paymentsApi.createPayment({
          sale_id: sale.id,
          payment_method: payment.method as 'cash' | 'mpesa' | 'airtel_money' | 'card' | 'bank_transfer',
          amount: payment.amount.toString(),
        });
      }

      // Complete sale (this will deduct inventory and award loyalty points)
      await salesApi.completeSale(sale.id);

      // Refresh current shift data to update totals
      try {
        const updatedShift = await shiftsApi.getCurrentShift();
        setCurrentShift(updatedShift);
      } catch (err) {
        console.error('Failed to refresh shift data:', err);
      }

      const saleDate = new Date(sale.created_at);
      const posNumber = currentShift?.id || 1;
      
      setLastSale({
        ...sale,
        payments,
        change,
        discountAmount,
        pointsDiscount,
        tax,
        saleDate: saleDate.toLocaleString(),
        posNumber,
        cashierName: user?.first_name || user?.username || 'Unknown'
      });

      // Show receipt
      setShowReceipt(true);

      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setPayments([]);
      setSearchQuery('');
      setBarcodeInput('');
      setDiscountCode('');
      setAppliedDiscount(null);
      setPointsToRedeem(0);

    } catch (err) {
      setError('Failed to process sale');
      setTimeout(() => setError(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  // Print receipt
  const printReceipt = () => {
    window.print();
  };

  // Filter products for search
  const filteredProducts = searchQuery.trim() 
    ? products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery)
      )
    : products;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>POS Terminal</h2>
          <p className={themeClasses.textSecondary}>Process sales transactions</p>
        </div>
        <div className="flex items-center gap-3">
          {currentShift && (
            <div className={`px-4 py-2 rounded-xl ${themeClasses.card} border`}>
              <p className={`text-sm ${themeClasses.textSecondary}`}>Shift: #{currentShift.id}</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>Started: {new Date(currentShift.opening_time).toLocaleTimeString()}</p>
            </div>
          )}
          <div className={`px-4 py-2 rounded-xl ${themeClasses.card} border`}>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Cashier: {user?.first_name || user?.username}</p>
          </div>
          {currentShift && (
            <button
              onClick={() => setShowCloseShiftModal(true)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <X size={16} />
              End Shift
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Scanner */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="flex items-center gap-4">
              <div className={`flex-1 ${themeClasses.input} border rounded-xl px-4 py-3`}>
                <input
                  type="text"
                  placeholder="Scan barcode or enter manually..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addProductByBarcode(barcodeInput)}
                  className={`w-full bg-transparent ${themeClasses.text} outline-none`}
                  autoFocus
                />
              </div>
              <button
                onClick={() => addProductByBarcode(barcodeInput)}
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {/* Discount Code */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <Tag className={themeClasses.textSecondary} size={20} />
              <span className={`${themeClasses.text} font-medium`}>Discount Code</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter discount code..."
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className={`flex-1 ${themeClasses.input} border rounded-xl px-4 py-2 ${themeClasses.text} outline-none`}
              />
              <button
                onClick={applyDiscountCode}
                disabled={!discountCode.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
            {appliedDiscount && (
              <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                <span className="text-green-400 text-sm">
                  {appliedDiscount.code} ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `KES ${appliedDiscount.value}`} off)
                </span>
                <button
                  onClick={removeDiscount}
                  className="text-red-400 hover:text-red-300"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Product Search */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-4">
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent ${themeClasses.text} outline-none`}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.slice(0, 20).map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity <= 0}
                  className={`${themeClasses.hover} p-3 rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <p className={`${themeClasses.text} font-medium text-sm mb-1`}>{product.name}</p>
                  <p className={`${themeClasses.textSecondary} text-xs mb-2`}>KES {parseFloat(product.price).toLocaleString()}</p>
                  <p className={`text-xs ${product.stock_quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    Stock: {product.stock_quantity}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart and Checkout */}
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <User className={themeClasses.textSecondary} size={20} />
              <span className={`${themeClasses.text} font-medium`}>Customer</span>
              {selectedCustomer && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star size={16} />
                  <span className="text-sm">{loyaltyPoints} pts</span>
                </div>
              )}
            </div>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.id === parseInt(e.target.value));
                setSelectedCustomer(customer || null);
              }}
              className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.phone}) - {customer.total_points || 0} pts
                </option>
              ))}
            </select>

            {/* Loyalty Points Redemption */}
            {selectedCustomer && loyaltyPoints > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="text-yellow-500" size={16} />
                  <span className={`${themeClasses.text} text-sm font-medium`}>Redeem Points</span>
                  <span className={`${themeClasses.textSecondary} text-xs`}>(Max: {loyaltyPoints} pts = KES {(loyaltyPoints * 0.1).toFixed(2)})</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={loyaltyPoints}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Math.min(loyaltyPoints, parseInt(e.target.value) || 0))}
                  className={`w-full ${themeClasses.input} border rounded-xl px-3 py-2 ${themeClasses.text} outline-none text-sm`}
                  placeholder="Points to redeem"
                />
                <p className={`${themeClasses.textSecondary} text-xs mt-1`}>
                  Will save: KES {(pointsToRedeem * 0.1).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Shopping Cart */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className={themeClasses.textSecondary} size={20} />
              <span className={`${themeClasses.text} font-medium`}>Cart ({cart.length})</span>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className={`${themeClasses.hover} p-3 rounded-xl`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className={`${themeClasses.text} font-medium text-sm`}>{item.product.name}</p>
                      <p className={`${themeClasses.textSecondary} text-xs`}>KES {item.unitPrice.toLocaleString()} each</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className={`${themeClasses.text} font-semibold text-sm`}>KES {item.subtotal.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`${themeClasses.textSecondary}`}>Subtotal:</span>
                <span className={`${themeClasses.text} font-medium`}>KES {subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-KES {discountAmount.toLocaleString()}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Points Discount:</span>
                  <span>-KES {pointsDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={`${themeClasses.textSecondary}`}>Tax (16%):</span>
                <span className={`${themeClasses.text} font-medium`}>KES {tax.toLocaleString()}</span>
              </div>
              <hr className={`${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
              <div className="flex justify-between text-lg font-bold">
                <span className={`${themeClasses.text}`}>Total:</span>
                <span className={`${themeClasses.text}`}>KES {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className={`${themeClasses.card} border rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className={themeClasses.textSecondary} size={20} />
              <span className={`${themeClasses.text} font-medium`}>Payment</span>
              {totalPaid < total && (
                <span className="text-orange-400 text-sm">
                  Need KES {(total - totalPaid).toLocaleString()} more
                </span>
              )}
            </div>
            
            {/* Cash Payment Input */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Banknote className={themeClasses.text} size={20} />
                <span className={`${themeClasses.text} font-medium`}>Cash Payment</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount received"
                  id="cashAmount"
                  className={`flex-1 ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const amount = parseFloat((e.target as HTMLInputElement).value) || 0;
                      if (amount > 0) {
                        addPayment('cash', amount);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('cashAmount') as HTMLInputElement;
                    const amount = parseFloat(input?.value) || 0;
                    if (amount > 0) {
                      addPayment('cash', amount);
                      input.value = '';
                    }
                  }}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                >
                  Add Cash
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <span className={`${themeClasses.textSecondary} text-sm`}>OR</span>
              <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>

            {/* Digital Payment Methods */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => addPayment('mpesa')}
                className={`p-3 ${themeClasses.hover} rounded-xl flex flex-col items-center gap-1`}
              >
                <Smartphone size={20} className={themeClasses.text} />
                <span className={`${themeClasses.text} text-xs`}>M-Pesa</span>
              </button>
              <button
                onClick={() => addPayment('card')}
                className={`p-3 ${themeClasses.hover} rounded-xl flex flex-col items-center gap-1`}
              >
                <CreditCard size={20} className={themeClasses.text} />
                <span className={`${themeClasses.text} text-xs`}>Card</span>
              </button>
            </div>
            {totalPaid < total && (
              <p className={`${themeClasses.textSecondary} text-xs text-center mb-4`}>
                💡 Click payment methods above to add the remaining amount
              </p>
            )}

            {/* Payment Summary */}
            {payments.length > 0 && (
              <div className="space-y-2 mb-4">
                {payments.map((payment) => (
                  <div key={payment.method} className="flex justify-between items-center">
                    <span className={`${themeClasses.textSecondary} capitalize`}>{payment.method}:</span>
                    <div className="flex items-center gap-2">
                      <span className={`${themeClasses.text} font-medium`}>KES {payment.amount.toLocaleString()}</span>
                      <button
                        onClick={() => removePayment(payment.method)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <hr className={`${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
                <div className="flex justify-between font-semibold">
                  <span className={`${themeClasses.text}`}>Paid:</span>
                  <span className={`${themeClasses.text}`}>KES {totalPaid.toLocaleString()}</span>
                </div>
                {change > 0 && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 font-semibold">💰 Change Due:</span>
                      <span className="text-green-400 font-bold text-lg">KES {change.toLocaleString()}</span>
                    </div>
                    <p className="text-green-500/80 text-xs mt-1">
                      Give customer KES {change.toLocaleString()} in change
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={processSale}
              disabled={cart.length === 0 || totalPaid < total || processing}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="sm" />
              ) : (
                <>
                  <Check size={20} />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className={`${themeClasses.card} border rounded-2xl p-6 max-w-md w-full mx-4`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-orange-500" size={24} />
              <h3 className={`${themeClasses.text} text-xl font-bold`}>Open Shift Required</h3>
            </div>
            <p className={`${themeClasses.textSecondary} mb-6`}>
              You need to open a shift before processing sales. This helps track your cash transactions and sales for reporting purposes.
            </p>

            <div className="space-y-4">
              <div>
                <label className={`${themeClasses.text} text-sm font-medium block mb-2`}>Opening Cash Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0.00"
                  id="openingCash"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={`${themeClasses.text} text-sm font-medium block mb-2`}>Notes (Optional)</label>
                <textarea
                  id="shiftNotes"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none h-20 resize-none`}
                  placeholder="Any notes about this shift..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowShiftModal(false)}
                className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const openingCash = (document.getElementById('openingCash') as HTMLInputElement)?.value || '0.00';
                  const notes = (document.getElementById('shiftNotes') as HTMLTextAreaElement)?.value || '';

                  // Call the API with the form values
                  shiftsApi.openShift(openingCash || '0.00', notes)
                    .then(shift => {
                      setCurrentShift(shift);
                      setShowShiftModal(false);
                      setError(null);
                    })
                    .catch(err => {
                      console.error('Error opening shift:', err);
                      console.error('Response:', err.response);
                      if (err.response?.data?.error) {
                        setError(`Failed to open shift: ${err.response.data.error}`);
                      } else if (err.response?.data?.detail) {
                        setError(`Failed to open shift: ${err.response.data.detail}`);
                      } else if (err.message) {
                        setError(`Failed to open shift: ${err.message}`);
                      } else {
                        setError('Failed to open shift');
                      }
                    });
                }}
                disabled={processing}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="sm" />
                ) : (
                  <>
                    <Check size={18} />
                    Open Shift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseShiftModal && currentShift && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className={`${themeClasses.card} border rounded-2xl p-6 max-w-md w-full mx-4`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={24} />
              <h3 className={`${themeClasses.text} text-xl font-bold`}>Close Current Shift</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-xl ${themeClasses.hover}`}>
                <p className={`${themeClasses.text} font-medium`}>Shift #{currentShift.id}</p>
                <p className={`${themeClasses.textSecondary} text-sm`}>Started: {new Date(currentShift.opening_time).toLocaleString()}</p>
                <p className={`${themeClasses.textSecondary} text-sm`}>Opening Cash: KES {parseFloat(currentShift.opening_cash).toLocaleString()}</p>
                <p className={`${themeClasses.textSecondary} text-sm`}>Total Sales: KES {parseFloat(currentShift.total_sales).toLocaleString()}</p>
                <p className={`${themeClasses.textSecondary} text-sm`}>Transactions: {currentShift.total_transactions}</p>
              </div>
              
              <div>
                <label className={`${themeClasses.text} text-sm font-medium block mb-2`}>Closing Cash Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0.00"
                  id="closingCash"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                  placeholder="0.00"
                />
                <p className={`${themeClasses.textSecondary} text-xs mt-1`}>
                  Enter the actual cash amount in the register
                </p>
              </div>
              
              <div>
                <label className={`${themeClasses.text} text-sm font-medium block mb-2`}>Closing Notes (Optional)</label>
                <textarea
                  id="closeShiftNotes"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none h-20 resize-none`}
                  placeholder="Any notes about closing this shift..."
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseShiftModal(false)}
                className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseShift}
                disabled={processing}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="sm" />
                ) : (
                  <>
                    <X size={18} />
                    Close Shift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 no-print">
          <div className={`${themeClasses.card} border rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-bold ${themeClasses.text}`}>Receipt</h3>
              <div className="flex gap-2">
                <button
                  onClick={printReceipt}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Receipt Content for Printing */}
            <div id="receipt-content" className="receipt-content bg-white text-black p-8 rounded text-sm font-mono" style={{ width: '80mm' }}>
              {/* Store Header */}
              <div className="text-center border-b border-gray-800 pb-3 mb-3">
                <p className="font-bold text-lg">EL-MART</p>
                <p className="text-xs">Nairobi CBD</p>
                <p className="text-xs">+254726582960</p>
                <p className="text-xs">info@elmart.com</p>
                <p className="text-xs italic">Where quality meets affordability</p>
              </div>

              {/* POS Info */}
              <div className="text-xs border-b border-gray-800 pb-2 mb-3 space-y-1">
                <div className="flex justify-between">
                  <span>POS: 94</span>
                  <span>{lastSale.saleDate}</span>
                </div>
                <div>Receipt #: {lastSale.sale_number || `SALE-${lastSale.id}`}</div>
                <div>Tax ID: A00030554B</div>
              </div>

              {/* Items Table */}
              <div className="border-b border-gray-800 pb-3 mb-3">
                <div className="flex justify-between text-xs font-bold border-b border-gray-400 pb-2 mb-2">
                  <span>CODE</span>
                  <span>DESCRIPTION</span>
                  <span>QTY</span>
                  <span>PRICE</span>
                  <span>EXT</span>
                </div>
                <div className="space-y-1 text-xs">
                  {lastSale.items && lastSale.items.length > 0 ? (
                    lastSale.items.map((item, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between">
                          <span className="w-12">{item.product_barcode ?? item.product ?? idx}</span>
                          <span className="flex-1 ml-2">{item.product_name ?? 'Product'}</span>
                          <span className="w-8 text-right">{item.quantity}</span>
                          <span className="w-16 text-right">{parseFloat(item.unit_price ?? '0').toFixed(2)}</span>
                          <span className="w-16 text-right">{parseFloat(item.subtotal ?? '0').toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs">No items</div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="border-b border-gray-800 pb-3 mb-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{parseFloat(lastSale.subtotal ?? '0').toLocaleString()}</span>
                </div>
                {lastSale.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{lastSale.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {lastSale.pointsDiscount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Points Discount</span>
                    <span>-{lastSale.pointsDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1 mt-1">
                  <span>TOTAL</span>
                  <span>{parseFloat(lastSale.total_amount ?? '0').toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border-b border-gray-800 pb-3 mb-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Tendered</span>
                  <span>{(parseFloat(lastSale.total_amount ?? '0') + lastSale.change).toLocaleString()}</span>
                </div>
                {lastSale.change > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Change</span>
                    <span>{lastSale.change.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Amount in Words */}
              <div className="border-b border-gray-800 pb-3 mb-3 text-xs">
                <p className="text-center font-bold">
                  {numberToWords(Math.floor(parseFloat(lastSale.total_amount ?? '0')))} SHILLING ONLY
                </p>
              </div>

              {/* Tax Details */}
              {lastSale.tax_amount && (
                <div className="border-b border-gray-800 pb-3 mb-3">
                  <p className="text-xs font-bold mb-2">TAX DETAILS</p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>CODE</span>
                      <span>VATABLE</span>
                      <span>VAT AMT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>V</span>
                      <span>{(parseFloat(lastSale.total_amount ?? '0') - parseFloat(lastSale.tax_amount ?? '0')).toFixed(2)}</span>
                      <span>{parseFloat(lastSale.tax_amount ?? '0').toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* KRA eTIMS */}
              <div className="border-b border-gray-800 pb-3 mb-3 text-xs text-center">
                <p className="font-bold">KRA eTIMS</p>
                {lastSale.rcpt_signature && (
                  <p className="text-xs truncate">Sig: {lastSale.rcpt_signature}</p>
                )}
              </div>

              {/* Served By */}
              <div className="border-b border-gray-800 pb-3 mb-3 text-xs">
                <p>Served by: {lastSale.cashierName}</p>
              </div>

              {/* QR Code */}
              {lastSale.etims_qr_image && (
                <div className="text-center border-b border-gray-800 pb-3 mb-3">
                  <img
                    src={lastSale.etims_qr_image}
                    alt="QR Code"
                    className="w-24 h-24 mx-auto"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="text-center space-y-1 text-xs">
                <p className="font-bold">www.elmart.com</p>
                <p>Thank you for your purchase!</p>
                {lastSale.sale_number && (
                  <p className="text-xs">CU Serial: {lastSale.sale_number}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};