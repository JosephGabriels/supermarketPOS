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
  X,
  Check,
  AlertCircle,
  Tag,
  Star,
  Zap
} from 'lucide-react';
import { productsApi } from '../services/productsApi';
import { branchesApi, type Branch } from '../services/branchesApi';
import { customersApi } from '../services/customersApi';
import { salesApi } from '../services/salesApi';
import { discountsApi } from '../services/salesApi';
import { shiftsApi } from '../services/shiftsApi';
import { paymentsApi } from '../services/paymentsApi';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';

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
  created_at?: string;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
    const [currentSaleId, setCurrentSaleId] = useState<number | null>(null);
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
  const [lastSale, setLastSale] = useState<any>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Load products and customers
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let branchId = user?.branch;
        if (user?.role === 'admin' && selectedBranch) {
          branchId = selectedBranch;
        }
        const [productsRes, customersRes, branchesRes] = await Promise.all([
          productsApi.getProducts(branchId ? { branch: branchId } : undefined),
          customersApi.getCustomers(),
          user?.role === 'admin' ? branchesApi.getActiveBranches() : Promise.resolve([])
        ]);
        const normalizeList = (res: any) => {
          if (!res) return [];
          if (Array.isArray(res)) return res;
          if (res.results && Array.isArray(res.results)) return res.results;
          if (res.data) {
            if (Array.isArray(res.data)) return res.data;
            if (res.data.results && Array.isArray(res.data.results)) return res.data.results;
          }
          return [];
        };
        setProducts(normalizeList(productsRes));
        setCustomers(normalizeList(customersRes));
        setBranches(branchesRes || []);
        if (user?.role === 'admin' && branchesRes.length && !selectedBranch) {
          // Default to user's branch if available, otherwise first active branch
          const defaultBranch = user.branch && branchesRes.find(b => b.id === user.branch) 
            ? user.branch 
            : branchesRes[0].id;
          setSelectedBranch(defaultBranch);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, selectedBranch]);

  // Check for open shift
  useEffect(() => {
    const checkShift = async () => {
      try {
        setShiftLoading(true);
        try {
          const shift = await shiftsApi.getCurrentShift();
          setCurrentShift(shift);
        } catch (err: any) {
          setCurrentShift(null);
          setShowShiftModal(true);
        }
      } catch (err) {
        console.error('Error checking shift:', err);
      } finally {
        setShiftLoading(false);
      }
    };

    if (user) {
      checkShift();
    }
  }, [user]);

  // Auto-focus barcode input
  useEffect(() => {
    const barcodeInput = document.getElementById('barcode-input') as HTMLInputElement;
    if (barcodeInput) barcodeInput.focus();
  }, []);

  const handleCloseShift = async () => {
    if (!currentShift) return;
    
    try {
      setProcessing(true);
      const closingCash = (document.getElementById('closingCash') as HTMLInputElement)?.value || '0.00';
      const notes = (document.getElementById('closeShiftNotes') as HTMLTextAreaElement)?.value || '';
      
      await shiftsApi.closeShift(currentShift.id, closingCash, notes);
      
      setCurrentShift(null);
      setShowCloseShiftModal(false);
      setError(null);
      alert('Shift closed successfully!');
    } catch (err: any) {
      console.error('Error closing shift:', err);
      setError(err.response?.data?.error || 'Failed to close shift');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      setLoyaltyPoints(selectedCustomer.total_points || 0);
      setPointsToRedeem(0);
    } else {
      setLoyaltyPoints(0);
      setPointsToRedeem(0);
    }
  }, [selectedCustomer]);

  const addProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    let branchId = user?.branch ?? null;
    if (user?.role === 'admin' && selectedBranch != null) {
      branchId = selectedBranch;
    }

    try {
      if (branchId == null) {
        throw new Error('No branch selected or assigned for barcode lookup');
      }
      console.log('[POS Barcode Lookup]', { barcode, branchId, role: user?.role });
      const productRes = await productsApi.lookupByBarcode(barcode, branchId);
      let product = productRes;
      if (!product || typeof product !== 'object' || !product.id) {
        throw new Error('Invalid product data');
      }
      addToCart(product);
      setBarcodeInput('');
      setError(null);
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 500);
      // Re-focus on barcode input
      setTimeout(() => {
        const input = document.getElementById('barcode-input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    } catch (err) {
      console.error('Barcode lookup error:', err, { barcode, branchId });
      setError(`Product not found: ${barcode}`);
      setScanSuccess(false);
      setTimeout(() => setError(null), 3000);
    }
  };

  const addToCart = (product: any) => {
    const productId = product?.id;
    const productName = product?.name || 'Unknown';
    const productPrice = product?.price || '0';
    const productStock = product?.stock_quantity || 0;

    if (!productId) {
      setError('Invalid product: missing ID');
      return;
    }

    if ((productStock || 0) <= 0) {
      setError(`${productName} is out of stock`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const existingItem = cart.find(item => item.product.id === productId);
    const unitPrice = Number(productPrice) || 0;

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
      setCart([...cart, newItem]);
    }
  };

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

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? subtotal * (appliedDiscount.value / 100)
      : appliedDiscount.value
    : 0;
  
  const pointsDiscount = pointsToRedeem * 0.1;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount - pointsDiscount);
  // Prices are tax-inclusive; extract tax component (16%)
  // Tax = Total * (Rate / (100 + Rate))
  const tax = discountedSubtotal * (16 / 116);
  const total = discountedSubtotal;

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

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 9) {
      return `+254${cleaned}`;
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return `+${cleaned}`;
    }
    
    if (cleaned.length === 13 && phone.startsWith('+')) {
      return phone;
    }
    
    return phone;
  };

  const searchCustomerByPhone = async (phone: string) => {
    if (!phone.trim()) {
      setSelectedCustomer(null);
      return;
    }

    try {
      setSearchingCustomer(true);
      setError(null);
      const normalizedPhone = normalizePhoneNumber(phone);
      const customer = await customersApi.lookupByPhone(normalizedPhone);
      setSelectedCustomer(customer);
    } catch (err) {
      setError('Customer not found with that phone number');
      setSelectedCustomer(null);
      setTimeout(() => setError(null), 3000);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const addPayment = (method: 'cash' | 'mpesa' | 'card', amount?: number) => {
    if (method === 'cash' && amount) {
      const existingPayment = payments.find(p => p.method === 'cash');
      if (existingPayment) {
        setPayments(payments.map(p => 
          p.method === 'cash' ? { ...p, amount: p.amount + amount } : p
        ));
      } else {
        setPayments([...payments, { method, amount }]);
      }
    } else {
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

  const removePayment = (method: 'cash' | 'mpesa' | 'card') => {
    setPayments(payments.filter(p => p.method !== method));
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const change = totalPaid - total;

  const processSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (totalPaid < total) {
      setError('Insufficient payment');
      return;
    }

    let saleId = currentSaleId;
    let sale;
    try {
      setProcessing(true);
      setError(null);

      // If we don't have a pending sale, create one
      if (!saleId) {
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
        sale = await salesApi.createSale(saleData);
        saleId = sale.id;
        setCurrentSaleId(saleId);
      } else {
        // Fetch the sale if we already have a pending one
        sale = await salesApi.getSale(saleId);
      }

      // create payments and surface any payment errors
      for (const payment of payments) {
        try {
          await paymentsApi.createPayment({
            sale_id: sale.id,
            payment_method: payment.method as 'cash' | 'mpesa' | 'airtel_money' | 'card' | 'bank_transfer',
            amount: payment.amount.toFixed(2),
          });
        } catch (err: any) {
          console.error('Payment creation failed:', err);
          const raw = err?.data || err?.message || err;
          const detail = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
          setError(`Payment failed: ${detail}`);
          setProcessing(false);
          return;
        }
      }

      // Optimistic UI update: decrement local product stock immediately for speed
      const previousProducts = products;
      try {
        const optimistic = products.map((p) => {
          const cartItem = cart.find(c => c.product.id === p.id);
          if (!cartItem) return p;
          return { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) - cartItem.quantity) };
        });
        setProducts(optimistic);

        await salesApi.completeSale(sale.id);

        // Broadcast sale completed so other pages can refresh
        try {
          window.dispatchEvent(new CustomEvent('saleCompleted', { detail: { saleId: sale.id } }));
        } catch (e) {
          console.warn('Could not dispatch saleCompleted event', e);
        }

        // Refresh products to ensure accuracy after backend processing
        try {
          const productsRes2 = await productsApi.getProducts();
          const normalizeList = (res: any) => {
            if (!res) return [];
            if (Array.isArray(res)) return res;
            if (res.results && Array.isArray(res.results)) return res.results;
            if (res.data) {
              if (Array.isArray(res.data)) return res.data;
              if (res.data.results && Array.isArray(res.data.results)) return res.data.results;
            }
            return [];
          };
          setProducts(normalizeList(productsRes2));
        } catch (err) {
          console.error('Failed to refresh products after sale:', err);
        }
      } catch (err: any) {
        // Rollback optimistic update on failure
        setProducts(previousProducts);
        console.error('Sale completion failed:', err);
        const raw = err?.data?.error || err?.data?.message || err?.data || err?.message || err;
        const detail = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
        setError(`Sale completion failed: ${detail}`);
        setProcessing(false);
        return;
      }

      try {
        const updatedShift = await shiftsApi.getCurrentShift();
        setCurrentShift(updatedShift);
      } catch (err) {
        console.error('Failed to refresh shift data:', err);
      }

      // Fetch final sale data from backend to ensure accuracy (tax, totals)
      let finalSale = sale;
      try {
        const completed = await salesApi.getSale(sale.id);
        if (completed) finalSale = completed;
      } catch (err) {
        console.warn('Failed to fetch completed sale details, falling back to create response', err);
      }

      const currentBranch = branches.find(b => b.id === (selectedBranch || user?.branch));
      
      setLastSale({
        ...finalSale,
        payments,
        change,
        discountAmount,
        pointsDiscount,
        branch: currentBranch,
        cashierName: user?.first_name || user?.username || 'Unknown',
      });

      salesApi.printReceipt(sale.id).catch(err => {
        console.warn('Receipt print failed', err);
      });

      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setPayments([]);
      setSearchQuery('');
      setBarcodeInput('');
      setDiscountCode('');
      setAppliedDiscount(null);
      setPointsToRedeem(0);
      setPhoneNumber('');

      // Re-focus barcode input
      setTimeout(() => {
        const input = document.getElementById('barcode-input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    } catch (err: any) {
      console.error('Process sale error:', err);
      const detail = err?.data?.error || err?.data?.message || err?.message || String(err);
      setError(`Failed to process sale: ${detail}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery.trim() 
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery)
      : true;
    
    // Filter by branch if admin has selected one
    const matchesBranch = user?.role === 'admin' && selectedBranch
      ? product.branch === selectedBranch
      : true;

    return matchesSearch && matchesBranch;
  });

  if (loading || shiftLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-4 space-y-4`}>
      {user?.role === 'admin' && (
        <div className="mb-4 max-w-xs">
          <label className="block text-sm font-medium mb-2">Branch</label>
          <select
            value={selectedBranch || ''}
            onChange={e => setSelectedBranch(Number(e.target.value))}
            className="w-full px-4 py-3 border rounded-xl"
          >
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>🛒 POS Terminal</h2>
          <p className={`${themeClasses.textSecondary} text-sm`}>Fast & Efficient Checkout</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {currentShift && (
            <>
              <div className={`${themeClasses.card} border rounded-lg px-3 py-2`}>
                <p className={`${themeClasses.text} font-semibold`}>Shift #{currentShift.id}</p>
                <p className={`${themeClasses.textSecondary} text-xs`}>{new Date(currentShift.opening_time).toLocaleTimeString()}</p>
              </div>
              <button
                onClick={() => setShowCloseShiftModal(true)}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                End Shift
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-3 animate-pulse">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: SCANNER & PRODUCTS (3 cols on desktop) */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          {/* BARCODE SCANNER - PRIMARY INPUT */}
          <div className={`${themeClasses.card} border-2 ${scanSuccess ? 'border-green-500' : 'border-violet-500'} rounded-xl p-4 shadow-lg transition-all`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full ${scanSuccess ? 'bg-green-500/20' : 'bg-violet-500/20'} flex items-center justify-center transition-all`}>
                <Zap className={scanSuccess ? 'text-green-400' : 'text-violet-400'} size={20} />
              </div>
              <div>
                <label className={`${themeClasses.text} font-bold`}>Scan Barcode</label>
                <p className={`${themeClasses.textSecondary} text-xs`}>Scanner will auto-focus</p>
              </div>
            </div>
            <input
              id="barcode-input"
              autoFocus
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addProductByBarcode(barcodeInput);
                }
              }}
              placeholder="Scan item barcode..."
              className={`w-full px-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-lg font-mono font-bold`}
            />
          </div>

          {/* Quick Product Search */}
          <div className={`${themeClasses.card} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Search className={themeClasses.textSecondary} size={18} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent ${themeClasses.text} outline-none text-sm`}
              />
            </div>
            
            {searchQuery && (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {filteredProducts.slice(0, 12).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      addToCart(product);
                      setSearchQuery('');
                    }}
                    disabled={product.stock_quantity <= 0}
                    className={`p-2 rounded-lg text-left border transition-all text-xs ${product.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : `${themeClasses.hover} border-gray-700`}`}
                  >
                    <p className={`${themeClasses.text} font-bold truncate`}>{product.name}</p>
                    <p className={`${themeClasses.textSecondary} text-xs`}>
                      <CurrencyDisplay amount={product.price} />
                    </p>
                    <p className={`text-xs ${product.stock_quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {product.stock_quantity} in stock
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className={`${themeClasses.card} border rounded-xl p-4 flex-1 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
              <ShoppingCart size={18} />
              <span className={`${themeClasses.text} font-bold text-sm`}>Items ({cart.length})</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <p className={`${themeClasses.textSecondary} text-center text-xs py-6`}>
                  Scan or search items to add
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className={`${themeClasses.hover} p-2 rounded-lg border border-gray-700/30 text-xs`}>
                    <div className="flex justify-between items-start mb-1 gap-1">
                      <div className="flex-1 min-w-0">
                        <p className={`${themeClasses.text} font-bold truncate`}>{item.product.name}</p>
                        <p className={`${themeClasses.textSecondary} text-xs`}>
                          <CurrencyDisplay amount={item.unitPrice} />
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-600 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center text-white hover:bg-gray-500"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-5 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center text-white hover:bg-gray-500"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <p className={`${themeClasses.text} font-bold`}>
                        <CurrencyDisplay amount={item.subtotal} />
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: CART & PAYMENT (2 cols on desktop) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* TOTAL DISPLAY - PROMINENT FOR CUSTOMER */}
          <div className={`${themeClasses.card} border rounded-xl p-5 shadow-xl order-first lg:order-none`}>
            <p className={`${themeClasses.textSecondary} text-xs font-semibold mb-1`}>TOTAL</p>
            <div className="text-emerald-500 dark:text-emerald-400 text-6xl font-black mb-3">
              <CurrencyDisplay amount={total} />
            </div>
            
            {cart.length > 0 && (
              <div className={`space-y-1 text-sm ${themeClasses.textSecondary}`}>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <CurrencyDisplay amount={subtotal} />
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>-Discount:</span>
                    <CurrencyDisplay amount={discountAmount} />
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>-Points:</span>
                    <CurrencyDisplay amount={pointsDiscount} />
                  </div>
                )}
              </div>
            )}

            {totalPaid > 0 && (
              <div className={`mt-3 pt-3 border-t border-gray-700/30 text-sm font-bold ${themeClasses.text}`}>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <CurrencyDisplay amount={totalPaid} />
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Change:</span>
                    <CurrencyDisplay amount={change} />
                  </div>
                )}
                {totalPaid < total && (
                  <div className="text-red-500 mt-2">
                    Need: <CurrencyDisplay amount={total - totalPaid} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discount Code */}
          {!appliedDiscount && (
            <div className={`${themeClasses.card} border rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={18} className={themeClasses.textSecondary} />
                <span className={`${themeClasses.text} font-semibold text-sm`}>Discount Code</span>
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="Enter code..."
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className={`flex-1 ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none text-sm`}
                />
                <button
                  disabled={!discountCode || cart.length === 0}
                  onClick={applyDiscountCode}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
          {appliedDiscount && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
              <span className="text-green-400 font-semibold text-sm">✓ {appliedDiscount.code}</span>
              <button onClick={removeDiscount} className="text-red-400 hover:text-red-300">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Payment */}
          <div className={`${themeClasses.card} border rounded-xl p-4 space-y-2`}>
            <label className={`${themeClasses.text} font-bold text-xs block`}>PAYMENT</label>
            
            <div className="space-y-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Cash amount"
                id="cashAmount"
                className={`w-full ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none text-sm`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const amount = parseFloat((e.target as HTMLInputElement).value) || 0;
                    if (amount > 0) {
                      addPayment('cash', amount);
                      (e.target as HTMLInputElement).value = '';
                      (document.getElementById('barcode-input') as HTMLInputElement)?.focus();
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
                className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs transition-colors"
              >
                + Cash
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addPayment('mpesa')}
                className={`p-2 ${themeClasses.hover} rounded-lg border border-gray-700 flex flex-col items-center gap-1 text-xs`}
              >
                <Smartphone size={16} />
                <span className="font-semibold">M-Pesa</span>
              </button>
              <button
                onClick={() => addPayment('card')}
                className={`p-2 ${themeClasses.hover} rounded-lg border border-gray-700 flex flex-col items-center gap-1 text-xs`}
              >
                <CreditCard size={16} />
                <span className="font-semibold">Card</span>
              </button>
            </div>

            {payments.length > 0 && (
              <div className="pt-2 border-t border-gray-700 space-y-1 text-xs">
                {payments.map((payment) => (
                  <div key={payment.method} className="flex justify-between items-center">
                    <span className={`${themeClasses.textSecondary} capitalize font-semibold`}>{payment.method}</span>
                    <div className="flex items-center gap-1">
                      <CurrencyDisplay amount={payment.amount} className={`${themeClasses.text} font-bold`} />
                      <button
                        onClick={() => removePayment(payment.method)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer & Complete */}
          <div className="space-y-2">
            <div className="space-y-2">
              <label className={`${themeClasses.text} font-bold text-xs block`}>CUSTOMER (by phone)</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="755000049 (9 digits)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      searchCustomerByPhone(phoneNumber);
                    }
                  }}
                  disabled={searchingCustomer}
                  className={`flex-1 ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none text-sm disabled:opacity-50`}
                />
                <button
                  onClick={() => searchCustomerByPhone(phoneNumber)}
                  disabled={!phoneNumber.trim() || searchingCustomer}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  {searchingCustomer ? 'Searching...' : 'Search'}
                </button>
              </div>

              {selectedCustomer && (
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-emerald-500 font-bold text-sm">{selectedCustomer.name}</p>
                      <p className={`${themeClasses.textSecondary} text-xs`}>{selectedCustomer.phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setPhoneNumber('');
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-yellow-500" />
                    <span className="text-yellow-500 font-bold text-sm">{selectedCustomer.total_points} Points</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={processSale}
              disabled={cart.length === 0 || totalPaid < total || processing}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {processing ? (
                <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="sm" />
              ) : (
                <>
                  <Check size={18} />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
          <div className={`${themeClasses.card} border rounded-xl p-6 max-w-md w-full`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-orange-500" size={24} />
              <h3 className={`${themeClasses.text} text-lg font-bold`}>Open Shift</h3>
            </div>
            <p className={`${themeClasses.textSecondary} mb-4 text-sm`}>
              You need to open a shift before processing sales.
            </p>

            <div className="space-y-3 mb-4">
              <input
                type="number"
                step="0.01"
                min="0"
                defaultValue="0.00"
                id="openingCash"
                placeholder="Opening cash amount"
                className={`w-full ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none text-sm`}
              />
              <textarea
                id="shiftNotes"
                className={`w-full ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none h-16 resize-none text-sm`}
                placeholder="Notes (optional)..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowShiftModal(false)}
                className={`flex-1 py-2 border border-gray-600 ${themeClasses.text} rounded-lg font-semibold text-sm hover:${themeClasses.hover}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const openingCash = (document.getElementById('openingCash') as HTMLInputElement)?.value || '0.00';
                  const notes = (document.getElementById('shiftNotes') as HTMLTextAreaElement)?.value || '';
                  
                  shiftsApi.openShift(openingCash, notes)
                    .then(shift => {
                      setCurrentShift(shift);
                      setShowShiftModal(false);
                    })
                    .catch(err => {
                      setError(err.response?.data?.error || 'Failed to open shift');
                    });
                }}
                disabled={processing}
                className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50"
              >
                Open Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseShiftModal && currentShift && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
          <div className={`${themeClasses.card} border rounded-xl p-6 max-w-md w-full`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={24} />
              <h3 className={`${themeClasses.text} text-lg font-bold`}>Close Shift</h3>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-2">
                <p className={`${themeClasses.textSecondary} text-xs mb-1`}>Expected Cash in Drawer</p>
                <p className={`${themeClasses.text} text-xl font-bold`}>
                  <CurrencyDisplay amount={currentShift.expected_cash || currentShift.opening_cash} />
                </p>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                defaultValue={currentShift.expected_cash || currentShift.opening_cash}
                id="closingCash"
                placeholder="Closing cash amount"
                className={`w-full ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none text-sm`}
              />
              <textarea
                id="closeShiftNotes"
                className={`w-full ${themeClasses.input} border rounded-lg px-3 py-2 ${themeClasses.text} outline-none h-16 resize-none text-sm`}
                placeholder="Notes (optional)..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCloseShiftModal(false)}
                className={`flex-1 py-2 border border-gray-600 ${themeClasses.text} rounded-lg font-semibold text-sm hover:${themeClasses.hover}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseShift}
                disabled={processing}
                className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50"
              >
                Close Shift
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
