// utils/skuGenerator.ts

export interface SkuOptions {
    categoryPrefix?: string;
    separator?: string;
    numberLength?: number;
  }
  
  /**
   * Generates SKU from product name
   * Example: "Fresh Apples" -> "FR-APL-001"
   */
  export class SkuGenerator {
    private static commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'fresh', 'organic', 'natural', 'premium', 'quality', 'pure', 'best', 'new'
    ]);
  
    /**
     * Generate SKU code from product name
     */
    static generateFromName(name: string, options: SkuOptions = {}): string {
      const {
        categoryPrefix = '',
        separator = '-',
        numberLength = 3
      } = options;
  
      // Clean and split the name
      const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .trim();
  
      const words = cleanName.split(/\s+/).filter(word => 
        word.length > 0 && !this.commonWords.has(word)
      );
  
      let codePrefix = '';
  
      if (words.length === 1) {
        // Single word: take first 6 chars
        codePrefix = words[0].substring(0, 6).toUpperCase();
      } else if (words.length === 2) {
        // Two words: 3 chars from each
        codePrefix = (
          words[0].substring(0, 3) + 
          words[1].substring(0, 3)
        ).toUpperCase();
      } else {
        // Multiple words: 2 chars from first 3 words
        codePrefix = words
          .slice(0, 3)
          .map(word => word.substring(0, 2))
          .join('')
          .toUpperCase();
      }
  
      // Ensure minimum length
      if (codePrefix.length < 3) {
        codePrefix = codePrefix.padEnd(3, 'X');
      }
  
      // Build final SKU
      const parts = [];
      
      if (categoryPrefix) {
        parts.push(categoryPrefix.toUpperCase());
      }
      
      parts.push(codePrefix);
      
      // Add placeholder for number (will be replaced with actual sequence)
      const numberPlaceholder = '0'.repeat(numberLength);
      parts.push(numberPlaceholder);
  
      return parts.join(separator);
    }
  
    /**
     * Generate multiple SKU variations
     */
    static generateVariations(name: string, count: number = 5): string[] {
      const variations = [];
      const baseSku = this.generateFromName(name);
      
      // Add base version
      variations.push(baseSku);
      
      // Add abbreviated versions
      const words = name.toLowerCase().split(/\s+/);
      if (words.length > 1) {
        // First letter of each word
        const initials = words
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .padEnd(3, 'X');
        variations.push(`${initials}-000`);
        
        // First + Last word combination
        if (words.length >= 2) {
          const firstLast = (
            words[0].substring(0, 3) + 
            words[words.length - 1].substring(0, 3)
          ).toUpperCase();
          variations.push(`${firstLast}-000`);
        }
      }
      
      return variations.slice(0, count);
    }
  
    /**
     * Generate category-specific SKU
     */
    static generateWithCategory(name: string, category: string): string {
      const categoryMap: Record<string, string> = {
        'fruits': 'FR',
        'vegetables': 'VG', 
        'dairy': 'DA',
        'meat': 'MT',
        'beverages': 'BV',
        'snacks': 'SN',
        'bakery': 'BK',
        'frozen': 'FZ',
        'canned': 'CN',
        'spices': 'SP',
      };
  
      const categoryPrefix = categoryMap[category.toLowerCase()] || 
                            category.substring(0, 2).toUpperCase();
  
      return this.generateFromName(name, { 
        categoryPrefix,
        separator: '-',
        numberLength: 3 
      });
    }
  }
  
  /**
   * Hook for SKU generation in React components
   */
  export const useSkuGenerator = () => {
    const generateSku = (name: string, category?: string, existingSkus: string[] = []) => {
      let baseSku: string;
      
      if (category) {
        baseSku = SkuGenerator.generateWithCategory(name, category);
      } else {
        baseSku = SkuGenerator.generateFromName(name);
      }
  
      // Replace number placeholder with actual sequence
      return generateUniqueNumber(baseSku, existingSkus);
    };
  
    const generateVariations = (name: string, count?: number) => {
      return SkuGenerator.generateVariations(name, count);
    };
  
    return { generateSku, generateVariations };
  };
  
  /**
   * Generate unique number suffix for SKU
   */
  function generateUniqueNumber(skuTemplate: string, existingSkus: string[]): string {
    const basePattern = skuTemplate.replace(/0+$/, '');
    const numberLength = skuTemplate.match(/0+$/)?.[0].length || 3;
    
    // Find existing numbers for this pattern
    const existingNumbers = existingSkus
      .filter(sku => sku.startsWith(basePattern))
      .map(sku => {
        const match = sku.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
  
    // Find next available number
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }
  
    // Format with leading zeros
    const formattedNumber = nextNumber.toString().padStart(numberLength, '0');
    return basePattern + formattedNumber;
  }
  
  // Example usage patterns:
  export const skuExamples = {
    // Basic generation
    basic: () => {
      console.log(SkuGenerator.generateFromName("Fresh Apples")); // "FRAAPL-000"
      console.log(SkuGenerator.generateFromName("Organic Bananas")); // "ORBAN-000"
      console.log(SkuGenerator.generateFromName("Red Bell Pepper")); // "REBEP-000"
    },
  
    // With category
    withCategory: () => {
      console.log(SkuGenerator.generateWithCategory("Fresh Apples", "fruits")); // "FR-FRAPL-000"
      console.log(SkuGenerator.generateWithCategory("Carrots", "vegetables")); // "VG-CARROT-000"
    },
  
    // Multiple variations
    variations: () => {
      console.log(SkuGenerator.generateVariations("Premium Olive Oil"));
      // ["PREOL-000", "POO-000", "PREOIL-000"]
    }
  };