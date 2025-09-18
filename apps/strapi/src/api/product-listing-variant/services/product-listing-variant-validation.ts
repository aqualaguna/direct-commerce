/**
 * product-listing-variant-validation service
 */

export default ({ strapi }) => ({
  /**
   * Validate variant creation data
   */
  async validateVariantData(data) {
    const errors = [];

    // Check required fields
    if (!data.sku) {
      errors.push('SKU is required');
    }
    if (!data.basePrice || data.basePrice <= 0) {
      errors.push('Valid base price is required');
    }
    if (!data.productListing) {
      errors.push('Product listing is required');
    }

    // Check SKU uniqueness
    if (data.sku) {
      const existingVariant = await strapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst({
          filters: { sku: data.sku },
        });
      if (existingVariant) {
        errors.push('SKU must be unique');
      }
    }

    // Validate option values if provided
    if (data.optionValues && data.optionValues.length > 0) {
      const optionValueValidation = await this.validateOptionValues(
        data.optionValues,
        data.productListing
      );
      errors.push(...optionValueValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate option values for a product listing
   */
  async validateOptionValues(optionValueIds, productListingId) {
    const errors = [];

    // Get the product listing to check its option groups
    const productListing = await strapi
      .documents('api::product-listing.product-listing')
      .findOne({
        documentId: productListingId,
        populate: ['optionGroups'],
      });

    if (!productListing) {
      errors.push('Product listing not found');
      return { isValid: false, errors };
    }

    // Get all option values
    const optionValues = await strapi
      .documents('api::option-value.option-value')
      .findMany({
        filters: { documentId: { $in: optionValueIds } },
        populate: ['optionGroup'],
      });

    // Check if all option values belong to the product listing's option groups
    const productListingOptionGroupIds = productListing.optionGroups.map(
      og => og.documentId
    );
    const optionValueGroupIds = optionValues.map(
      ov => ov.optionGroup.documentId
    );

    for (const groupId of optionValueGroupIds) {
      if (!productListingOptionGroupIds.includes(groupId)) {
        errors.push(
          'Option value does not belong to product listing option groups'
        );
        break;
      }
    }

    // Check for duplicate option groups (can't have multiple values from same group)
    const uniqueGroupIds = [...new Set(optionValueGroupIds)];
    if (uniqueGroupIds.length !== optionValueGroupIds.length) {
      errors.push('Cannot have multiple values from the same option group');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Check if option combination already exists
   */
  async checkOptionCombinationExists(
    optionValueIds,
    productListingId,
    excludeVariantId = null
  ) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          ...(excludeVariantId && { documentId: { $ne: excludeVariantId } }),
        },
        populate: ['optionValues'],
      });

    if (!variants || !Array.isArray(variants)) {
      return {
        exists: false,
        existingVariant: null,
      };
    }

    for (const variant of variants) {
      if (!variant.optionValues || !Array.isArray(variant.optionValues)) {
        continue;
      }

      const variantOptionValueIds = variant.optionValues.map(
        ov => ov.documentId
      );

      // Check if this variant has the same option combination
      if (
        optionValueIds.length === variantOptionValueIds.length &&
        optionValueIds.every(id => variantOptionValueIds.includes(id))
      ) {
        return {
          exists: true,
          existingVariant: variant,
        };
      }
    }

    return {
      exists: false,
      existingVariant: null,
    };
  },

  /**
   * Validate inventory update
   */
  async validateInventoryUpdate(documentId, newInventory) {
    const errors = [];

    if (typeof newInventory !== 'number' || newInventory < 0) {
      errors.push('Inventory must be a non-negative number');
    }

    // Check if variant exists
    const variant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findOne({
        documentId,
      });

    if (!variant) {
      errors.push('Variant not found');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Generate unique SKU for variant
   */
  async generateUniqueSku(productListingId, optionValues = []) {
    const productListing = await strapi
      .documents('api::product-listing.product-listing')
      .findOne({
        documentId: productListingId,
        populate: ['product'],
      });

    if (!productListing) {
      throw new Error('Product listing not found');
    }

    let baseSku = productListing.product.sku || 'PROD';

    if (optionValues.length > 0) {
      const optionValueData = await strapi
        .documents('api::option-value.option-value')
        .findMany({
          filters: { documentId: { $in: optionValues } },
        });

      const optionSuffix = optionValueData.map(ov => ov.value).join('-');
      baseSku = `${baseSku}-${optionSuffix}`;
    }

    // Check if SKU already exists and generate unique one
    let uniqueSku = baseSku;
    let counter = 1;

    while (true) {
      const existingVariant = await strapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst({
          filters: { sku: uniqueSku },
        });

      if (!existingVariant) {
        break;
      }

      uniqueSku = `${baseSku}-${counter}`;
      counter++;
    }

    return uniqueSku;
  },

  /**
   * Get variant availability status
   */
  async getVariantAvailability(variant) {
    if (!variant.isActive) {
      return {
        available: false,
        reason: 'Variant is inactive',
      };
    }

    if (variant.inventory <= 0) {
      return {
        available: false,
        reason: 'Out of stock',
      };
    }

    return {
      available: true,
      reason: 'Available',
    };
  },

  /**
   * Validate variant update data
   */
  async validateVariantUpdate(data, variantId) {
    const errors = [];

    // Check price if provided
    if (data.price !== undefined && (!data.price || data.price <= 0)) {
      errors.push('Valid price is required');
    }

    // Check inventory if provided
    if (
      data.inventory !== undefined &&
      (typeof data.inventory !== 'number' || data.inventory < 0)
    ) {
      errors.push('Inventory must be non-negative');
    }

    // Check SKU uniqueness if provided
    if (data.sku) {
      const existingVariant = await strapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst({
          filters: {
            sku: data.sku,
            documentId: { $ne: variantId },
          },
        });
      if (existingVariant) {
        errors.push('SKU must be unique');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate bulk variant data
   */
  async validateBulkVariantData(bulkData) {
    const results = [];
    let hasErrors = false;

    for (const data of bulkData) {
      const validation = await this.validateVariantData(data);
      results.push({
        data,
        isValid: validation.isValid,
        errors: validation.errors,
      });

      if (!validation.isValid) {
        hasErrors = true;
      }
    }

    return {
      isValid: !hasErrors,
      errors: results.filter(r => !r.isValid).flatMap(r => r.errors),
      results,
    };
  },
});
