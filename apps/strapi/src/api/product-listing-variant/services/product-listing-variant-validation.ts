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
    if (!data.basePrice || data.basePrice <= 0) {
      errors.push('Valid base price is required');
    }
    if (!data.productListing) {
      errors.push('Product listing is required');
    }


    // Validate product listing exists
    if (data.productListing) {
      const productListing = await strapi
        .documents('api::product-listing.product-listing')
        .findOne({
          documentId: data.productListing,
        });
      
      if (!productListing) {
        errors.push('Product listing not found');
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

    // Check if all requested option values were found
    const foundOptionValueIds = optionValues.map(ov => ov.documentId);
    const missingOptionValueIds = optionValueIds.filter(id => !foundOptionValueIds.includes(id));
    
    if (missingOptionValueIds.length > 0) {
      errors.push('One or more option values not found');
      return { isValid: false, errors };
    }

    // Check if all option values belong to the product listing's option groups
    const productListingOptionGroupIds = productListing.optionGroups?.map(
      og => og.documentId
    ) || [];
    const optionValueGroupIds = optionValues.map(
      ov => ov.optionGroup?.documentId
    ).filter(Boolean);

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
    if (data.basePrice !== undefined && (!data.basePrice || data.basePrice <= 0)) {
      errors.push('Valid base price is required');
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
