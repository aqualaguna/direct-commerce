/**
 * product-listing-variant controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::product-listing-variant.product-listing-variant',
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const { query } = ctx;

        // Apply filters with improved error handling
        const filters = {
          ...((query.filters as Record<string, any>) || {}),
        } as any;

        // Apply sorting with validation
        const sort = (query.sort as Record<string, any>) || 'createdAt:desc';

        // Apply pagination with improved validation
        const pagination = {
          page: Math.max(1, parseInt(String(query.page || '1')) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(String(query.pageSize || '25')) || 25),
            100
          ),
        };

        // Use Document Service API
        const variants = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .findMany({
            filters,
            sort,
            limit: pagination.pageSize,
            start: (pagination.page - 1) * pagination.pageSize,
            populate: ['productListing', 'optionValues', 'images'],
          });

        // Get total count for pagination metadata
        const total = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .count({ filters });

        return {
          data: variants,
          meta: {
            pagination: {
              page: pagination.page,
              pageSize: pagination.pageSize,
              pageCount: Math.ceil(total / pagination.pageSize),
              total: total,
            },
          },
        };
      } catch (error) {
        strapi.log.error('Error in product-listing-variant find:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async findOne(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Variant documentId is required');
        }

        // Use Document Service API with documentId
        const variant = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .findOne({
            documentId,
            populate: ['productListing', 'optionValues', 'images'],
          });

        if (!variant) {
          return ctx.notFound('Variant not found');
        }

        return { data: variant };
      } catch (error) {
        strapi.log.error('Error in product-listing-variant findOne:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async create(ctx) {
      try {
        const { data } = ctx.request.body;
        const validationService = strapi.service('api::product-listing-variant.product-listing-variant-validation');
        const validationResult = await validationService.validateVariantData(data);
        if (!validationResult.isValid) {
          return ctx.badRequest("Validation failed", validationResult.errors);
        }

        // Use Document Service API for creation
        const variant = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .create({
            data,
            populate: ['productListing', 'optionValues', 'images'],
          });

        return { data: variant };
      } catch (error) {
        strapi.log.error('Error in product-listing-variant create:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async update(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;
        const { data } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Variant documentId is required');
        }

        // Use Document Service API for updates
        const variant = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .update({
            documentId,
            data,
            populate: ['productListing', 'optionValues', 'images'],
          });

        return { data: variant };
      } catch (error) {
        strapi.log.error('Error in product-listing-variant update:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async delete(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Variant documentId is required');
        }

        // Use Document Service API for deletion
        await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .delete({
            documentId,
          });

        return { message: 'Variant deleted successfully' };
      } catch (error) {
        strapi.log.error('Error in product-listing-variant delete:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get variants by product listing
    async findByProductListing(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { query } = ctx;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          productListing: productListingId,
        };

        const variants = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .findMany({
            filters,
            sort: 'createdAt:asc',
            populate: ['optionValues', 'images'],
          });

        return variants;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant findByProductListing:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to find variant by option combination
    async findByOptions(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { optionValues } = ctx.request.body;

        if (
          !productListingId ||
          !optionValues ||
          !Array.isArray(optionValues)
        ) {
          return ctx.badRequest(
            'Product listing ID and option values array are required'
          );
        }

        // Find variants for this product listing
        const variants = await strapi
          .documents('api::product-listing-variant.product-listing-variant')
          .findMany({
            filters: {
              productListing: productListingId,
            },
            populate: ['optionValues'],
          });

        // Find variant that matches the option combination
        const matchingVariant = variants.find(variant => {
          const variantOptionValues = variant.optionValues.map(
            ov => ov.documentId
          );
          return optionValues.every(optionValueId =>
            variantOptionValues.includes(optionValueId)
          );
        });

        if (!matchingVariant) {
          return ctx.notFound('No variant found with the specified options');
        }

        return matchingVariant;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant findByOptions:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },


    // Custom method to calculate variant price
    async calculatePrice(ctx) {
      try {
        const { documentId } = ctx.params;
        const { discountPercent, quantity, bulkPricing, currency } =
          ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Variant documentId is required');
        }

        const pricingService = strapi.service(
          'api::product-listing-variant.variant-pricing-inventory'
        );
        const priceInfo = await pricingService.calculateVariantPrice(
          documentId,
          {
            discountPercent,
            quantity,
            bulkPricing,
            currency,
          }
        );

        return priceInfo;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant calculatePrice:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },



    // Custom method to bulk update prices
    async bulkUpdatePrices(ctx) {
      try {
        const { variantIds, priceUpdate } = ctx.request.body;

        if (!variantIds || !Array.isArray(variantIds) || !priceUpdate) {
          return ctx.badRequest(
            'Variant IDs array and price update object are required'
          );
        }

        const pricingService = strapi.service(
          'api::product-listing-variant.variant-pricing-inventory'
        );
        const results = await pricingService.bulkUpdatePrices(
          variantIds,
          priceUpdate
        );

        return results;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant bulkUpdatePrices:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get pricing summary for product listing
    async getPricingSummary(ctx) {
      try {
        const { productListingId } = ctx.params;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const pricingService = strapi.service(
          'api::product-listing-variant.variant-pricing-inventory'
        );
        const summary =
          await pricingService.getVariantPricingSummary(productListingId);

        return summary;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant getPricingSummary:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get available variants
    async getAvailableVariants(ctx) {
      try {
        const { productListingId } = ctx.params;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const variants =
          await selectionService.getAvailableVariants(productListingId);

        return variants;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant getAvailableVariants:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to validate variant selection
    async validateSelection(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { selectedOptions } = ctx.request.body;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        if (!selectedOptions || !Array.isArray(selectedOptions)) {
          return ctx.badRequest('Selected options array is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const validation = await selectionService.validateVariantSelection(
          productListingId,
          selectedOptions
        );

        return validation;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant validateSelection:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get variant options
    async getVariantOptions(ctx) {
      try {
        const { productListingId } = ctx.params;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const options =
          await selectionService.getVariantOptions(productListingId);

        return options;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant getVariantOptions:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get variant availability matrix
    async getAvailabilityMatrix(ctx) {
      try {
        const { productListingId } = ctx.params;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const matrix =
          await selectionService.getVariantAvailabilityMatrix(productListingId);

        return matrix;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant getAvailabilityMatrix:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get recommended variants
    async getRecommendedVariants(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { limit = 5 } = ctx.query;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const variants = await selectionService.getRecommendedVariants(
          productListingId,
          parseInt(String(limit))
        );

        return variants;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant getRecommendedVariants:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get variant by SKU
    async getBySku(ctx) {
      try {
        const { sku } = ctx.params;

        if (!sku) {
          return ctx.badRequest('SKU is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const variant = await selectionService.getVariantBySku(sku);

        if (!variant) {
          return ctx.notFound('Variant not found');
        }

        return variant;
      } catch (error) {
        strapi.log.error('Error in product-listing-variant getBySku:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get variant suggestions
    async getVariantSuggestions(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { partialOptions } = ctx.request.body;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        if (!partialOptions || !Array.isArray(partialOptions)) {
          return ctx.badRequest('Partial options array is required');
        }

        const selectionService = strapi.service(
          'api::product-listing-variant.variant-selection-validation'
        );
        const suggestions = await selectionService.getVariantSuggestions(
          productListingId,
          partialOptions
        );

        return suggestions;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing-variant getVariantSuggestions:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },
  })
);
