/**
 * product-listing-variant-validation service
 */

import { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Validate variant creation data
   */
  async validateVariantData(data) {
    const errors = [];
    let extraData: any = {};
    // Check required fields
    if (!data.basePrice || data.basePrice <= 0) {
      errors.push('Valid base price is required');
    }
    if (!data.productListing) {
      errors.push('Product listing is required');
    }

    if (!data.product) {
      errors.push('Product is required');
    } else {
      extraData.product = await strapi
        .documents('api::product.product')
        .findOne({
          documentId: data.product,
        });
      if (!extraData.product) {
        errors.push('Product not found');
      }
    }


    // Validate product listing exists
    if (data.productListing) {
      const productListing = await strapi
        .documents('api::product-listing.product-listing')
        .findOne({
          documentId: data.productListing,
          populate: ['optionGroups'],
        });

      if (!productListing) {
        errors.push('Product listing not found');
      } else {
        extraData.productListing = productListing;
      }
    }

    // Validate option values if provided
    if (data.optionValue) {
      const optionValueValidation = await this.validateOptionValues(
        data.optionValue,
        extraData
      );
      errors.push(...optionValueValidation.errors);
    } else {
      errors.push('Option value are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      extraData,
    };
  },

  /**
   * Validate option values for a product listing
   */
  async validateOptionValues(optionValueId, extraData) {
    const errors = [];
    if (!extraData.productListing || !extraData.product) {
      errors.push('Product listing or product not found');
      return {
        isValid: false,
        errors,
      };
    }
    // get option value 
    const optionValue = await strapi
      .documents('api::option-value.option-value')
      .findOne({
        documentId: optionValueId,
        populate: ['optionGroup'],
      });
    if (!optionValue) {
      errors.push('Option value not found');
    }
    const optionValueGroupId = optionValue.optionGroup.documentId;

    if (!extraData.productListing.optionGroups.find(og => og.documentId === optionValueGroupId)) {
      errors.push('Option value does not belong to the product listing');
    }
    // check for duplicate option value
    const duplicateOptionValue = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findFirst({
        filters: {
          optionValue: {documentId: optionValueId},
          productListing: extraData.productListing.id,
        },
      });
    if (duplicateOptionValue) {
      errors.push('Option value already exists');
    }

    // check for duplicate product
    const duplicateProductId = await strapi
      .documents('api::product-listing-variant.product-listing-variant')
      .findFirst({
        filters: {
          product: extraData.product.id,
          productListing: extraData.productListing.id,
        },
      });
    if (duplicateProductId) {
      errors.push('Product Variant with this product already exists');
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
