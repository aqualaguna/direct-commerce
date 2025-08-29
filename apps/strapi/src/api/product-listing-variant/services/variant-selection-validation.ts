/**
 * variant-selection-validation service
 */

export default ({ strapi }) => ({
  /**
   * Get available variants for a product listing
   */
  async getAvailableVariants(productListingId) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          isActive: true,
          status: 'published',
        },
        populate: ['optionValues', 'images'],
      });

    return variants.filter(variant => variant.inventory > 0);
  },

  /**
   * Validate variant selection
   */
  async validateVariantSelection(productListingId, selectedOptions) {
    const errors = [];
    const warnings = [];

    // Get the product listing to check its option groups
    const productListing = await strapi
      .documents('api::product-listing.product-listing')
      .findOne({
        documentId: productListingId,
        populate: ['optionGroups'],
      });

    if (!productListing) {
      errors.push('Product listing not found');
      return { isValid: false, errors, warnings };
    }

    // Get all variants for this product listing
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          status: 'published',
        },
        populate: ['optionValues'],
      });

    // Check if all required option groups are selected
    const requiredOptionGroups = productListing.optionGroups.filter(
      og => og.isRequired
    );
    const selectedOptionGroupIds = selectedOptions.map(
      option => option.optionGroupId
    );

    for (const requiredGroup of requiredOptionGroups) {
      if (!selectedOptionGroupIds.includes(requiredGroup.documentId)) {
        errors.push(
          `Required option group "${requiredGroup.displayName}" is not selected`
        );
      }
    }

    // Check if selected options are valid
    for (const selectedOption of selectedOptions) {
      const optionValue = await strapi
        .documents('api::option-value.option-value')
        .findOne({
          documentId: selectedOption.optionValueId,
          populate: ['optionGroup'],
        });

      if (!optionValue) {
        errors.push(`Invalid option value selected`);
        continue;
      }

      // Check if option value belongs to the product listing's option groups
      const isValidOption = productListing.optionGroups.some(
        og => og.documentId === optionValue.optionGroup.documentId
      );

      if (!isValidOption) {
        errors.push(
          `Option value "${optionValue.displayName}" is not valid for this product`
        );
      }
    }

    // Find matching variant
    const matchingVariant = this.findMatchingVariant(variants, selectedOptions);

    if (!matchingVariant) {
      errors.push('No variant found with the selected options');
    } else {
      // Check availability
      if (matchingVariant.inventory <= 0) {
        errors.push('Selected variant is out of stock');
      } else if (matchingVariant.inventory < 10) {
        warnings.push('Selected variant has low stock');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      matchingVariant: matchingVariant || null,
    };
  },

  /**
   * Find matching variant based on selected options
   */
  findMatchingVariant(variants, selectedOptions) {
    for (const variant of variants) {
      const variantOptionValues = variant.optionValues.map(ov => ov.documentId);
      const selectedOptionValueIds = selectedOptions.map(
        option => option.optionValueId
      );

      // Check if all selected options match this variant
      const isMatch = selectedOptionValueIds.every(optionValueId =>
        variantOptionValues.includes(optionValueId)
      );

      if (isMatch) {
        return variant;
      }
    }

    return null;
  },

  /**
   * Get variant options for display
   */
  async getVariantOptions(productListingId) {
    const productListing = await strapi
      .documents('api::product-listing.product-listing')
      .findOne({
        documentId: productListingId,
        populate: ['optionGroups'],
      });

    if (!productListing) {
      throw new Error('Product listing not found');
    }

    const options = [];

    for (const optionGroup of productListing.optionGroups) {
      const optionValues = await strapi
        .documents('api::option-value.option-value')
        .findMany({
          filters: {
            optionGroup: optionGroup.documentId,
            isActive: true,
          },
          sort: { sortOrder: 'asc' },
        });

      options.push({
        optionGroup: {
          id: optionGroup.documentId,
          name: optionGroup.name,
          displayName: optionGroup.displayName,
          type: optionGroup.type,
          isRequired: optionGroup.isRequired,
        },
        optionValues: optionValues.map(ov => ({
          id: ov.documentId,
          value: ov.value,
          displayName: ov.displayName,
          sortOrder: ov.sortOrder,
        })),
      });
    }

    return options;
  },

  /**
   * Get variant availability matrix
   */
  async getVariantAvailabilityMatrix(productListingId) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          status: 'published',
        },
        populate: ['optionValues'],
      });

    const availabilityMatrix = {};

    for (const variant of variants) {
      const optionCombination = variant.optionValues
        .map(ov => ov.value)
        .sort()
        .join('-');

      availabilityMatrix[optionCombination] = {
        variantId: variant.documentId,
        available: variant.isActive && variant.inventory > 0,
        inventory: variant.inventory,
        price: variant.price,
        sku: variant.sku,
      };
    }

    return availabilityMatrix;
  },

  /**
   * Get recommended variants
   */
  async getRecommendedVariants(productListingId, limit = 5) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          isActive: true,
          status: 'published',
          inventory: { $gt: 0 },
        },
        sort: { inventory: 'desc' },
        pagination: { page: 1, pageSize: limit },
        populate: ['optionValues', 'images'],
      });

    return variants;
  },

  /**
   * Check if variant combination exists
   */
  async checkVariantCombinationExists(productListingId, optionValueIds) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          status: 'published',
        },
        populate: ['optionValues'],
      });

    const matchingVariant = this.findMatchingVariant(
      variants,
      optionValueIds.map(id => ({ optionValueId: id }))
    );

    return {
      exists: !!matchingVariant,
      variant: matchingVariant,
    };
  },

  /**
   * Get variant by SKU
   */
  async getVariantBySku(sku) {
    const variant = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findFirst({
        filters: { sku },
        populate: ['productListing', 'optionValues', 'images'],
      });

    return variant;
  },

  /**
   * Get variant suggestions based on partial selection
   */
  async getVariantSuggestions(productListingId, partialOptions) {
    const variants = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findMany({
        filters: {
          productListing: productListingId,
          isActive: true,
          status: 'published',
        },
        populate: ['optionValues'],
      });

    const suggestions = [];

    for (const variant of variants) {
      const variantOptionValues = variant.optionValues.map(ov => ov.documentId);
      const partialOptionValueIds = partialOptions.map(
        option => option.optionValueId
      );

      // Check if variant matches partial selection
      const matchesPartial = partialOptionValueIds.every(optionValueId =>
        variantOptionValues.includes(optionValueId)
      );

      if (matchesPartial && variant.inventory > 0) {
        suggestions.push({
          variantId: variant.documentId,
          sku: variant.sku,
          price: variant.price,
          inventory: variant.inventory,
          optionValues: variant.optionValues.map(ov => ({
            id: ov.documentId,
            value: ov.value,
            displayName: ov.displayName,
          })),
        });
      }
    }

    return suggestions;
  },
});
