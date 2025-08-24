"use client"

import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, Plus, Search, Filter, Eye, EyeOff, ChevronDown, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import {
  fetchWalletBalance,
  fetchTransactions,
  initiateDeposit,
  toggleBalanceVisibility,
  setShowAddFundsModal,
  setSearchTerm,
  setFilterType,
  selectFilteredTransactions,
  selectWalletLoading,
  selectWalletErrors,
  selectWalletFilters,
  selectWalletUI,
  selectTotalBalance,
  clearError,
  type Transaction,
} from '@/app/store/slices/walletSlice';
import { PriceFormatter } from '@/components/reuse/FormatCurrency';
import { toast } from 'react-toastify';

const WalletComponent = () => {
  const dispatch = useDispatch();
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Redux selectors
  const transactions = useSelector(selectFilteredTransactions);
  const loading = useSelector(selectWalletLoading);
  const errors = useSelector(selectWalletErrors);
  const filters = useSelector(selectWalletFilters);
  const ui = useSelector(selectWalletUI);
  const totalBalance = useSelector(selectTotalBalance);

  // Local state for add funds modal
  const [amount, setAmount] = React.useState('');

  // Initialize data on component mount
  useEffect(() => {
    dispatch(fetchWalletBalance());
    dispatch(fetchTransactions());
  }, [dispatch]);

  // Handle payment callback from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const reference = urlParams.get('reference');
  
    if (paymentStatus && reference) {
      // Handle different payment statuses
      if (paymentStatus === 'success') {
        toast.success('Payment successful! Your wallet has been credited.');
        
        // Refresh wallet data
        dispatch(fetchWalletBalance());
        dispatch(fetchTransactions({ refresh: true }));
        
      } else if (paymentStatus === 'failed') {
        toast.error('Payment failed. Please try again.');
      } else if (paymentStatus === 'error') {
        toast.error('An error occurred during payment processing.');
      }
  
      // Clean up URL to remove payment parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [dispatch]);

  // Handle add funds - Updated to properly handle Paystack redirect
  const handleAddFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      console.log('Initiating deposit for amount:', amount);
      
      const result = await dispatch(initiateDeposit({ 
        amount: parseFloat(amount) 
      })).unwrap();
      
      console.log('Deposit result received:', result);
      
      // Close modal first
      dispatch(setShowAddFundsModal(false));
      setAmount('');
      
      // Check for authorization URL in the result
      const authUrl = result.paymentUrl || result.data?.paymentUrl;
      
      if (authUrl) {
        console.log('Redirecting to Paystack URL:', authUrl);
        
        // Show loading toast
        toast.info('Redirecting to payment gateway...');
        
        // Immediate redirect - no delay needed
        window.location.href = authUrl;
      } else {
        console.error('No authorization URL found in result:', result);
        toast.error('Failed to get payment authorization. Please try again.');
      }
      
    } catch (error: any) {
      console.error('Failed to initiate deposit:', error);
      
      // Handle different error formats
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          'Failed to initiate deposit. Please try again.';
      
      toast.error(errorMessage);
    }
  };

    // Close modal when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          dispatch(setShowAddFundsModal(false));
        }
      };
  
      if (ui.showAddFundsModal) {
        document.addEventListener('mousedown', handleClickOutside);
      }
  
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ui.showAddFundsModal, dispatch]);
  
  // Format date to readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchTerm(e.target.value));
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilterType(e.target.value as 'All' | 'Credit' | 'Debit'));
  };

  // Handle balance visibility toggle
  const handleToggleBalanceVisibility = () => {
    dispatch(toggleBalanceVisibility());
  };

  // Handle open add funds modal
  const handleOpenAddFundsModal = () => {
    dispatch(setShowAddFundsModal(true));
  };

  // Handle close add funds modal
  const handleCloseAddFundsModal = () => {
    dispatch(setShowAddFundsModal(false));
    setAmount('');
  };

  // Clear errors when they exist
  const handleClearError = (errorType: keyof typeof errors) => {
    dispatch(clearError(errorType));
  };

  // Handle Enter key in amount input
  const handleAmountKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFunds();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-gray-600">Manage your wallet and transactions</p>
        </div>

        {/* Error Messages */}
        {Object.entries(errors).map(([key, error]) => (
          error && (
            <div key={key} className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => handleClearError(key as keyof typeof errors)}
                className="text-red-600 hover:text-red-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        ))}

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Wallet Balance</h2>
            </div>
            <button
              onClick={handleToggleBalanceVisibility}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              {ui.isBalanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="mb-6">
            <div className="text-4xl font-bold mb-2">
              {loading.balance ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-2xl">Loading...</span>
                </div>
              ) : ui.isBalanceVisible ? (
                <PriceFormatter amount={totalBalance} showDecimals/>
              ) : (
                '****'
              )}
            </div>
            <p className="text-green-100">Available Balance</p>
          </div>

          <button 
            onClick={handleOpenAddFundsModal}
            disabled={loading.deposit}
            className="flex items-center gap-2 bg-white cursor-pointer text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.deposit ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Funds
              </>
            )}
          </button>
        </div>

        {/* Transaction History Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="space-y-4 md:space-y-0">
              {/* Title - always full width */}
              <h3 className="text-xl font-semibold text-gray-900 w-full mb-4">Transaction History</h3>
              
              <div className="flex justify-between flex-col md:flex-row items-start md:items-center gap-3 w-full">
                {/* Search - full width on mobile, auto width on desktop */}
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={filters.searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none w-full md:min-w-64"
                  />
                </div>

                {/* Filter - full width on mobile, auto width on desktop */}
                <div className="flex flex-col md:flex md:flex-row gap-2 w-full md:w-auto">
                  <button className="p-2 hover:bg-gray-100 text-left rounded-lg transition-colors">
                    Filter
                  </button>
                  
                  <div className="relative w-full xs:w-auto flex">
                    <select
                      value={filters.filterType}
                      onChange={handleFilterChange}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none w-full cursor-pointer"
                    >
                      <option>All</option>
                      <option>Credit</option>
                      <option>Debit</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Transactions List */}
        {loading.transactions ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction: Transaction) => {
                // Determine if transaction is credit or debit
                const isCredit =
                  transaction.type === 'WALLET_TOPUP' ||
                  transaction.type === 'REFUND' ||
                  transaction.type === 'credit';
                
                const isDebit = 
                  transaction.type === 'ORDER_PAYMENT' ||
                  transaction.type === 'debit';

                const amountSign = isCredit ? '+' : '-';
                const amountColor = isCredit ? 'text-green-600' : 'text-red-600';
                const bgColor = isCredit ? 'bg-green-100' : 'bg-red-100';
                const iconColor = isCredit ? 'text-green-600' : 'text-red-600';
                const Icon = isCredit ? ArrowDown : ArrowUp;

                // Handle different status formats
                const getStatusStyle = (status: string) => {
                  const normalizedStatus = status.toUpperCase();
                  switch (normalizedStatus) {
                    case 'SUCCESS':
                    case 'COMPLETED':
                      return 'bg-green-100 text-green-800';
                    case 'PENDING':
                      return 'bg-yellow-100 text-yellow-800';
                    case 'FAILED':
                    case 'CANCELED':
                    case 'CANCELLED':
                      return 'bg-red-100 text-red-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                };

                return (
                  <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${bgColor}`}>
                          <Icon className={`w-5 h-5 ${iconColor}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                          <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${getStatusStyle(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${amountColor}`}>
                          {amountSign}₦{transaction.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No transactions found.</h4>
              <p className="text-gray-500">Your transaction history will appear here once you start making transactions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Funds Modal */}
      {ui.showAddFundsModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl w-full max-w-md p-6"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Funds to Wallet</h2>
              <button 
                onClick={handleCloseAddFundsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                disabled={loading.deposit}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="mb-6">
              <p className="text-gray-600 mb-6">
                Enter the amount you want to add to your wallet. You'll be redirected to Paystack to complete the payment.
              </p>
              
              {errors.deposit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errors.deposit}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyPress={handleAmountKeyPress}
                    placeholder="Enter amount"
                    min="100"
                    step="0.01"
                    disabled={loading.deposit}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum amount: ₦100</p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseAddFundsModal}
                disabled={loading.deposit}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFunds}
                disabled={!amount || parseFloat(amount) < 100 || loading.deposit}
                className="flex-1 py-3 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2  cursor-pointer"
              >
                {loading.deposit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletComponent;