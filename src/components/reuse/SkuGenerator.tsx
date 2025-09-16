import React, { useState, useEffect } from 'react';
import { RefreshCw, Edit3, Check, Wand2, AlertTriangle } from 'lucide-react';
import { 
  generateProductSku, 
  clearGeneratedSku,
  selectSkuGenerating,
  selectGeneratedSku 
} from '@/app/store/slices/adminProductsSlice';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';

export interface HybridSkuInputProps {
  value: string;
  onChange: (value: string) => void;
  productName: string;
  categoryId?: string | null | undefined;  // Allow multiple types
  existingSkus?: string[];
  className?: string;
}

// Robust ObjectID validation that handles any input type
const isValidObjectId = (id: unknown): id is string => {
  // First, ensure it's a string and not null/undefined
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Remove any whitespace
  const cleanId = id.trim();
  
  // Check length (24 characters)
  if (cleanId.length !== 24) {
    return false;
  }

  // Check if it's all hexadecimal characters
  const hexPattern = /^[a-fA-F0-9]{24}$/;
  return hexPattern.test(cleanId);
};

// Convert any value to a valid string or null
const sanitizeCategoryId = (id: unknown): string | null => {
  if (!id) return null;
  
  if (typeof id === 'string') {
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  
  if (typeof id === 'number') {
    return id.toString();
  }
  
  // Handle objects with id property
  if (typeof id === 'object' && id !== null && 'id' in id) {
    return sanitizeCategoryId((id as { id: unknown }).id);
  }
  
  return null;
};

export const HybridSkuInput: React.FC<HybridSkuInputProps> = ({ 
  value, 
  onChange, 
  productName, 
  categoryId, 
  existingSkus = [],
  className = "" 
}) => {
  const dispatch = useAppDispatch();
  const skuGenerating = useAppSelector(selectSkuGenerating);
  const generatedSku = useAppSelector(selectGeneratedSku);
  
  const [inputMode, setInputMode] = useState('hybrid');
  // const [isEditing, setIsEditing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tempValue, setTempValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryWarning, setCategoryWarning] = useState<string | null>(null);

  // Get sanitized and validated category ID
  const sanitizedCategoryId = sanitizeCategoryId(categoryId);
  const isValidCategoryId = sanitizedCategoryId && isValidObjectId(sanitizedCategoryId);

  // Validate categoryId when it changes
  useEffect(() => {
    // Debug logging to help identify the issue
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 CategoryId Analysis:', {
        original: categoryId,
        originalType: typeof categoryId,
        originalValue: JSON.stringify(categoryId),
        sanitized: sanitizedCategoryId,
        isValid: isValidCategoryId,
      });
    }

    if (categoryId && !isValidCategoryId) {
      setCategoryWarning(
        `Invalid category ID format (${typeof categoryId}: ${JSON.stringify(categoryId)}) - SKU will be generated without category`
      );
    } else {
      setCategoryWarning(null);
    }
  }, [categoryId, sanitizedCategoryId, isValidCategoryId]);

  // Auto-generate SKU when in auto mode and name changes
  useEffect(() => {
    if (inputMode === 'auto' && productName && productName.length > 2) {
      const validCategoryId = isValidCategoryId ? sanitizedCategoryId : undefined;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Auto-generating SKU:', {
          productName,
          originalCategoryId: categoryId,
          sanitizedCategoryId,
          validCategoryId,
          willUseCategory: !!validCategoryId
        });
      }
      
      dispatch(generateProductSku({
        name: productName,
        categoryId: validCategoryId
      }));
    }
  }, [productName, categoryId, sanitizedCategoryId, isValidCategoryId, inputMode, dispatch]);

  // Handle generated SKU
  useEffect(() => {
    if (generatedSku) {
      if (inputMode === 'auto') {
        onChange(generatedSku);
        dispatch(clearGeneratedSku());
      } else if (inputMode === 'hybrid') {
        // Show as suggestion in hybrid mode
        setSuggestions(prev => {
          const newSuggestions = [generatedSku, ...prev.filter(s => s !== generatedSku)];
          return newSuggestions.slice(0, 4);
        });
        dispatch(clearGeneratedSku());
      }
    }
  }, [generatedSku, inputMode, onChange, dispatch]);

  // Generate suggestions based on product name
  const generateSuggestions = () => {
    if (!productName) return;
    
    const validCategoryId = isValidCategoryId ? sanitizedCategoryId : undefined;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💡 Generating suggestions:', {
        productName,
        originalCategoryId: categoryId,
        sanitizedCategoryId,
        validCategoryId,
        willUseCategory: !!validCategoryId
      });
    }
    
    dispatch(generateProductSku({
      name: productName,
      categoryId: validCategoryId
    }));
    setShowSuggestions(true);
  };

  // Check if SKU already exists
  const isSkuExists = (sku: string): boolean => {
    return existingSkus.includes(sku) && sku !== value;
  };

  // Validate SKU format
  const validateSkuFormat = (sku: string): boolean => {
    return /^[A-Z0-9-]{6,20}$/.test(sku);
  };

  const handleInputChange = (newValue: string) => {
    setTempValue(newValue);
    if (inputMode === 'manual' || inputMode === 'hybrid') {
      onChange(newValue);
    }
  };

  const handleModeChange = (mode: string) => {
    setInputMode(mode);
    if (mode === 'auto' && productName) {
      const validCategoryId = isValidCategoryId ? sanitizedCategoryId : undefined;
      dispatch(generateProductSku({
        name: productName,
        categoryId: validCategoryId
      }));
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const getSkuStatus = () => {
    if (!value) return { type: 'empty', message: 'SKU required' };
    if (isSkuExists(value)) return { type: 'error', message: 'SKU already exists' };
    if (!validateSkuFormat(value)) return { type: 'warning', message: 'Invalid format (6-20 chars, A-Z, 0-9, -)' };
    return { type: 'success', message: 'Valid SKU' };
  };

  const status = getSkuStatus();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category Warning */}
      {categoryWarning && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-xs text-yellow-700">{categoryWarning}</span>
        </div>
      )}

      {/* Mode Selection */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleModeChange('manual')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            inputMode === 'manual' 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
        >
          <Edit3 className="w-3 h-3 inline mr-1" />
          Manual
        </button>
        
        <button
          type="button"
          onClick={() => handleModeChange('hybrid')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            inputMode === 'hybrid' 
              ? 'bg-purple-500 text-white border-purple-500' 
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
        >
          <Wand2 className="w-3 h-3 inline mr-1" />
          Hybrid
        </button>
        
        <button
          type="button"
          onClick={() => handleModeChange('auto')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            inputMode === 'auto' 
              ? 'bg-green-500 text-white border-green-500' 
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
        >
          <RefreshCw className="w-3 h-3 inline mr-1" />
          Auto
        </button>
      </div>

      {/* SKU Input */}
      <div className="relative">
        <div className={`flex items-center border rounded-lg ${
          status.type === 'error' ? 'border-red-300' :
          status.type === 'warning' ? 'border-yellow-300' :
          status.type === 'success' ? 'border-green-300' :
          'border-gray-300'
        }`}>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
            placeholder={
              inputMode === 'auto' ? 'Auto-generated SKU...' :
              inputMode === 'hybrid' ? 'Enter SKU or use suggestions' :
              'Enter SKU manually'
            }
            disabled={inputMode === 'auto' && skuGenerating}
            className={`flex-1 px-3 py-2 bg-transparent outline-none ${
              inputMode === 'auto' ? 'text-gray-500' : 'text-gray-900'
            }`}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1 px-2">
            {inputMode === 'hybrid' && (
              <button
                type="button"
                onClick={generateSuggestions}
                disabled={!productName || skuGenerating}
                className="p-1 text-purple-500 hover:bg-purple-50 rounded disabled:opacity-50"
                title="Generate suggestions"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            )}
            
            {inputMode === 'manual' && productName && (
              <button
                type="button"
                onClick={() => {
                  const validCategoryId = isValidCategoryId ? sanitizedCategoryId : undefined;
                  dispatch(generateProductSku({
                    name: productName,
                    categoryId: validCategoryId
                  }));
                }}
                disabled={skuGenerating}
                className="p-1 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50"
                title="Generate from name"
              >
                <RefreshCw className={`w-4 h-4 ${skuGenerating ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {skuGenerating && (
              <div className="w-4 h-4">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${
            status.type === 'error' ? 'text-red-500' :
            status.type === 'warning' ? 'text-yellow-600' :
            status.type === 'success' ? 'text-green-600' :
            'text-gray-500'
          }`}>
            {status.message}
          </span>
          
          {inputMode === 'auto' && (
            <span className="text-xs text-gray-400">
              Updates automatically
            </span>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-600">Suggestions</span>
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionSelect(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                disabled={isSkuExists(suggestion)}
              >
                <span className="font-mono text-sm">{suggestion}</span>
                {isSkuExists(suggestion) ? (
                  <span className="text-xs text-red-500">Exists</span>
                ) : (
                  <Check className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100" />
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="w-full px-3 py-2 text-center text-xs text-gray-500 hover:bg-gray-50 border-t border-gray-100"
            >
              Close suggestions
            </button>
          </div>
        )}
      </div>

      {/* Mode Descriptions */}
      <div className="text-xs text-gray-500">
        {inputMode === 'manual' && 'You have full control - enter SKU manually'}
        {inputMode === 'hybrid' && 'Get suggestions but you decide what to use'}
        {inputMode === 'auto' && 'SKU generated automatically from product name'}
      </div>
    </div>
  );
};