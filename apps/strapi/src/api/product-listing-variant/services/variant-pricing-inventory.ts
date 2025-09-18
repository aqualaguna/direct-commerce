/**
 * variant-pricing-inventory service
 */

export default ({ strapi }) => ({
  /**
   * Calculate variant price with overrides
   */
  async calculateVariantPrice(variantId: string, options: {
    discountPercent?: number;
    quantity?: number;
    bulkPricing?: any;
    currency?: string;
  } = {}) {
    const variant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findOne({
        documentId: variantId,
        populate: ['productListing'],
      });

    if (!variant) {
      throw new Error('Variant not found');
    }

    let finalPrice = variant.price;

    // Apply any discounts or promotions
    if (options.discountPercent) {
      finalPrice = finalPrice * (1 - options.discountPercent / 100);
    }

    // Apply bulk pricing if quantity threshold is met
    if (options.quantity && options.bulkPricing) {
      const bulkPrice = this.calculateBulkPrice(
        variant.price,
        options.quantity,
        options.bulkPricing
      );
      if (bulkPrice < finalPrice) {
        finalPrice = bulkPrice;
      }
    }

    return {
      originalPrice: variant.price,
      discountPrice: variant.discountPrice,
      finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
      currency: options.currency || 'USD',
    };
  },

  /**
   * Calculate bulk pricing
   */
  calculateBulkPrice(basePrice: number, quantity: number, bulkPricing: any) {
    // Find the applicable bulk pricing tier
    const [applicableTier] = bulkPricing
      .filter(tier => quantity >= tier.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity);

    if (applicableTier) {
      return basePrice * (1 - applicableTier.discountPercent / 100);
    }

    return basePrice;
  },

  /**
   * Update variant inventory
   */
  async updateVariantInventory(
    variantId: string,
    quantity: number,
    operation: 'set' | 'add' | 'subtract' | 'reserve' = 'set',
    reason: string = 'manual'
  ) {
    const variant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findOne({
        documentId: variantId,
      });

    if (!variant) {
      throw new Error('Variant not found');
    }

    let newInventory = variant.inventory;

    switch (operation) {
      case 'set':
        newInventory = quantity;
        break;
      case 'add':
        newInventory = variant.inventory + quantity;
        break;
      case 'subtract':
        newInventory = Math.max(0, variant.inventory - quantity);
        break;
      case 'reserve':
        // This would integrate with a reservation system
        newInventory = Math.max(0, variant.inventory - quantity);
        break;
      default:
        throw new Error('Invalid operation');
    }

    // Update the variant
    const updatedVariant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .update({
        documentId: variantId,
        data: { inventory: newInventory },
      });

    // Log inventory change
    await this.logInventoryChange(
      variantId,
      variant.inventory,
      newInventory,
      operation,
      reason
    );

    return updatedVariant;
  },

  /**
   * Check variant availability
   */
  async checkVariantAvailability(variantId, requestedQuantity = 1) {
    const variant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findOne({
        documentId: variantId,
      });

    if (!variant) {
      return {
        available: false,
        reason: 'Variant not found',
      };
    }

    if (!variant.isActive) {
      return {
        available: false,
        reason: 'Variant is inactive',
      };
    }

    if (variant.inventory < requestedQuantity) {
      return {
        available: false,
        reason: 'Insufficient inventory',
        availableQuantity: variant.inventory,
        requestedQuantity,
      };
    }

    return {
      available: true,
      reason: 'Available',
      availableQuantity: variant.inventory,
      requestedQuantity,
    };
  },

  /**
   * Get low stock variants
   */
  async getLowStockVariants(threshold = 10) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          inventory: { $lte: threshold },
          isActive: true,
          status: 'published',
        },
        populate: ['productListing'],
      });

    return variants.map(variant => ({
      ...variant,
      isLowStock: true,
      stockLevel: variant.inventory,
    }));
  },

  /**
   * Get out of stock variants
   */
  async getOutOfStockVariants() {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          inventory: 0,
          isActive: true,
          status: 'published',
        },
        populate: ['productListing'],
      });

    return variants;
  },

  /**
   * Bulk update variant prices
   */
  async bulkUpdatePrices(variantIds, priceUpdate) {
    const results = {
      success: 0,
      errors: 0,
      details: [],
    };

    for (const variantId of variantIds) {
      try {
        const variant = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .findOne({
            documentId: variantId,
          });

        if (!variant) {
          results.errors++;
          results.details.push({ variantId, error: 'Variant not found' });
          continue;
        }

        let newPrice = variant.price;

        if (priceUpdate.type === 'percentage') {
          newPrice = variant.price * (1 + priceUpdate.value / 100);
        } else if (priceUpdate.type === 'fixed') {
          newPrice = variant.price + priceUpdate.value;
        } else if (priceUpdate.type === 'set') {
          newPrice = priceUpdate.value;
        }

        if (newPrice < 0) {
          results.errors++;
          results.details.push({
            variantId,
            error: 'Price cannot be negative',
          });
          continue;
        }

        await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .update({
            documentId: variantId,
            data: { price: Math.round(newPrice * 100) / 100 },
          });

        results.success++;
        results.details.push({
          variantId,
          success: true,
          oldPrice: variant.price,
          newPrice,
        });
      } catch (error) {
        results.errors++;
        results.details.push({ variantId, error: error.message });
      }
    }

    return results;
  },

  /**
   * Get variant pricing summary
   */
  async getVariantPricingSummary(productListingId) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          status: 'published',
        },
      });

    if (variants.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        priceRange: 0,
        variantCount: 0,
      };
    }

    const prices = variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return {
      minPrice,
      maxPrice,
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceRange: maxPrice - minPrice,
      variantCount: variants.length,
    };
  },

  /**
   * Log inventory change
   */
  async logInventoryChange(
    variantId,
    oldQuantity,
    newQuantity,
    operation,
    reason
  ) {
    // This would integrate with a logging system or create inventory history records
    strapi.log.info(
      `Inventory change for variant ${variantId}: ${oldQuantity} -> ${newQuantity} (${operation}) - ${reason}`
    );

    // You could also create inventory history records here
    // await strapi.documents('api::inventory-history.inventory-history').create({
    //   data: {
    //     variant: variantId,
    //     oldQuantity,
    //     newQuantity,
    //     operation,
    //     reason,
    //     timestamp: new Date()
    //   }
    // })
  },

  /**
   * Validate price update
   */
  async validatePriceUpdate(variantId, newPrice) {
    const errors = [];

    if (typeof newPrice !== 'number' || newPrice < 0) {
      errors.push('Price must be a non-negative number');
    }

    const variant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findOne({
        documentId: variantId,
      });

    if (!variant) {
      errors.push('Variant not found');
    }

    // Check if price is reasonable (not too high or too low)
    if (newPrice > 10000) {
      errors.push('Price seems too high');
    }

    if (newPrice < 0.01) {
      errors.push('Price seems too low');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
});
