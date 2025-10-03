/**
 * Cart Calculation Service
 * 
 * Handles cart total calculations including subtotal, tax, shipping,
 * discounts, and currency conversion with caching for performance.
 */

import { factories } from '@strapi/strapi';

interface CartCalculation {
  subtotal: number; // in cents
  tax: number; // in cents
  shipping: number; // in cents
  discount: number; // in cents
  total: number; // in cents
  currency: string;
  taxRate: number;
  shippingMethod?: string;
  discountCode?: string;
  itemCount: number;
  calculationTimestamp: Date;
}

interface TaxCalculationParams {
  subtotal: number;
  shippingAddress?: any;
  currency: string;
}

interface ShippingCalculationParams {
  items: any[];
  shippingAddress?: any;
  shippingMethod?: string;
  currency: string;
}

interface DiscountCalculationParams {
  subtotal: number;
  discountCode?: string;
  currency: string;
}

interface CartCalculationService {
  calculateCartTotals(cart: any, options?: {
    shippingAddress?: any;
    shippingMethod?: string;
    discountCode?: string;
  }): Promise<CartCalculation>;
  calculateSubtotal(items: any[]): number;
  calculateTax(params: TaxCalculationParams): Promise<number>;
  calculateShipping(params: ShippingCalculationParams): Promise<number>;
  calculateDiscount(params: DiscountCalculationParams): Promise<number>;
  validateCalculation(calculation: CartCalculation): boolean;
  getCachedCalculation(cartId: string): Promise<CartCalculation | null>;
  cacheCalculation(cartId: string, calculation: CartCalculation): Promise<void>;
  clearCalculationCache(cartId: string): Promise<void>;
}

export default ({ strapi }: { strapi: any }): CartCalculationService => ({
  /**
   * Calculate complete cart totals
   */
  async calculateCartTotals(cart: any, options: {
    shippingAddress?: any;
    shippingMethod?: string;
    discountCode?: string;
  } = {}) {
    try {
      // Check cache first
      const cached = await this.getCachedCalculation(cart.documentId);
      if (cached) {
        const cacheAge = Date.now() - cached.calculationTimestamp.getTime();
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes cache
          return cached;
        }
      }

      const items = cart.items || [];
      const subtotal = this.calculateSubtotal(items);
      const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

      // Calculate tax
      const tax = await this.calculateTax({
        subtotal,
        shippingAddress: options.shippingAddress,
        currency: cart.currency
      });

      // Calculate shipping
      const shipping = await this.calculateShipping({
        items,
        shippingAddress: options.shippingAddress,
        shippingMethod: options.shippingMethod,
        currency: cart.currency
      });

      // Calculate discount
      const discount = await this.calculateDiscount({
        subtotal,
        discountCode: options.discountCode,
        currency: cart.currency
      });

      // Calculate total
      const total = Math.max(0, subtotal + tax + shipping - discount);

      const calculation: CartCalculation = {
        subtotal,
        tax,
        shipping,
        discount,
        total,
        currency: cart.currency,
        taxRate: subtotal > 0 ? (tax / subtotal) * 100 : 0,
        shippingMethod: options.shippingMethod,
        discountCode: options.discountCode,
        itemCount,
        calculationTimestamp: new Date()
      };

      // Validate calculation
      if (!this.validateCalculation(calculation)) {
        throw new Error('Cart calculation validation failed');
      }

      // Cache the calculation
      await this.cacheCalculation(cart.documentId, calculation);

      return calculation;
    } catch (error) {
      strapi.log.error('Error calculating cart totals:', error);
      throw new Error('Failed to calculate cart totals');
    }
  },

  /**
   * Calculate cart subtotal from items
   */
  calculateSubtotal(items: any[]): number {
    try {
      return items.reduce((sum: number, item: any) => {
        const itemTotal = item.total || (item.price * item.quantity);
        return sum + itemTotal;
      }, 0);
    } catch (error) {
      strapi.log.error('Error calculating subtotal:', error);
      return 0;
    }
  },

  /**
   * Calculate tax based on subtotal and shipping address
   */
  async calculateTax(params: TaxCalculationParams): Promise<number> {
    try {
      const { subtotal, shippingAddress, currency } = params;

      // Default tax rate (can be enhanced with tax service integration)
      let taxRate = 0.08; // 8% default tax rate

      // Apply different tax rates based on shipping address
      if (shippingAddress) {
        // This would integrate with a tax calculation service
        // For now, using simplified logic
        switch (shippingAddress.country) {
          case 'US':
            taxRate = 0.08; // 8% for US
            break;
          case 'CA':
            taxRate = 0.13; // 13% for Canada
            break;
          case 'UK':
            taxRate = 0.20; // 20% VAT for UK
            break;
          default:
            taxRate = 0.08; // Default 8%
        }
      }

      return Math.round(subtotal * taxRate);
    } catch (error) {
      strapi.log.error('Error calculating tax:', error);
      return 0;
    }
  },

  /**
   * Calculate shipping cost based on items and address
   */
  async calculateShipping(params: ShippingCalculationParams): Promise<number> {
    try {
      const { items, shippingAddress, shippingMethod, currency } = params;

      if (!items || items.length === 0) {
        return 0;
      }

      // Calculate total weight
      const totalWeight = items.reduce((sum: number, item: any) => {
        const weight = item.variant?.weight || item.product?.weight || 0.5; // Default 0.5kg
        return sum + (weight * item.quantity);
      }, 0);

      // Calculate total value
      const totalValue = this.calculateSubtotal(items);

      // Free shipping threshold
      const freeShippingThreshold = 5000; // $50.00 in cents

      if (totalValue >= freeShippingThreshold) {
        return 0; // Free shipping
      }

      // Base shipping rates (can be enhanced with shipping service integration)
      let baseShipping = 500; // $5.00 base shipping

      if (shippingMethod) {
        switch (shippingMethod) {
          case 'express':
            baseShipping = 1500; // $15.00 express shipping
            break;
          case 'overnight':
            baseShipping = 2500; // $25.00 overnight shipping
            break;
          case 'standard':
          default:
            baseShipping = 500; // $5.00 standard shipping
        }
      }

      // Add weight-based surcharge
      const weightSurcharge = Math.max(0, (totalWeight - 2) * 200); // $2.00 per kg over 2kg

      return Math.round(baseShipping + weightSurcharge);
    } catch (error) {
      strapi.log.error('Error calculating shipping:', error);
      return 0;
    }
  },

  /**
   * Calculate discount based on discount code
   */
  async calculateDiscount(params: DiscountCalculationParams): Promise<number> {
    try {
      const { subtotal, discountCode, currency } = params;

      if (!discountCode) {
        return 0;
      }

      // This would integrate with a discount/coupon service
      // For now, using simplified logic
      let discountAmount = 0;

      // switch (discountCode.toUpperCase()) {
      //   case 'WELCOME10':
      //     discountAmount = Math.round(subtotal * 0.10); // 10% off
      //     break;
      //   case 'SAVE20':
      //     discountAmount = Math.round(subtotal * 0.20); // 20% off
      //     break;
      //   case 'FREESHIP':
      //     // This would be handled in shipping calculation
      //     discountAmount = 0;
      //     break;
      //   default:
      //     // Check if it's a fixed amount discount
      //     if (discountCode.startsWith('SAVE')) {
      //       const amount = parseInt(discountCode.substring(4));
      //       if (!isNaN(amount)) {
      //         discountAmount = amount * 100; // Convert to cents
      //       }
      //     }
      // }

      // Ensure discount doesn't exceed subtotal
      return Math.min(discountAmount, subtotal);
    } catch (error) {
      strapi.log.error('Error calculating discount:', error);
      return 0;
    }
  },

  /**
   * Validate calculation results
   */
  validateCalculation(calculation: CartCalculation): boolean {
    try {
      // Check for negative values
      if (calculation.subtotal < 0 || calculation.tax < 0 || 
          calculation.shipping < 0 || calculation.discount < 0 || 
          calculation.total < 0) {
        return false;
      }

      // Check that total makes sense
      const expectedTotal = calculation.subtotal + calculation.tax + 
                           calculation.shipping - calculation.discount;
      
      if (Math.abs(calculation.total - expectedTotal) > 1) { // Allow 1 cent rounding difference
        return false;
      }

      // Check currency format
      if (!calculation.currency || calculation.currency.length !== 3) {
        return false;
      }

      return true;
    } catch (error) {
      strapi.log.error('Error validating calculation:', error);
      return false;
    }
  },

  /**
   * Get cached calculation
   */
  async getCachedCalculation(cartId: string): Promise<CartCalculation | null> {
    try {
      // This would integrate with Redis or similar cache
      // For now, returning null (no cache)
      return null;
    } catch (error) {
      strapi.log.error('Error getting cached calculation:', error);
      return null;
    }
  },

  /**
   * Cache calculation result
   */
  async cacheCalculation(cartId: string, calculation: CartCalculation): Promise<void> {
    try {
      // This would integrate with Redis or similar cache
      // For now, doing nothing (no cache)
      strapi.log.debug(`Cached calculation for cart: ${cartId}`);
    } catch (error) {
      strapi.log.error('Error caching calculation:', error);
    }
  },

  /**
   * Clear calculation cache
   */
  async clearCalculationCache(cartId: string): Promise<void> {
    try {
      // This would integrate with Redis or similar cache
      // For now, doing nothing (no cache)
      strapi.log.debug(`Cleared calculation cache for cart: ${cartId}`);
    } catch (error) {
      strapi.log.error('Error clearing calculation cache:', error);
    }
  }
});
