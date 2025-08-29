/**
 * option-value controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::option-value.option-value',
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const { query } = ctx;

        // Apply filters with improved error handling
        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          status: 'published',
        } as any;

        // Apply sorting with validation
        const sort = (query.sort as Record<string, any>) || {
          sortOrder: 'asc',
          createdAt: 'desc',
        };

        // Apply pagination with improved validation
        const pagination = {
          page: Math.max(1, parseInt(String(query.page || '1')) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(String(query.pageSize || '25')) || 25),
            100
          ),
        };

        // Use Document Service API
        const optionValues = await strapi
          .documents('api::option-value.option-value')
          .findMany({
            filters,
            sort,
            pagination,
            populate: ['optionGroup', 'variants'],
          });

        return optionValues;
      } catch (error) {
        strapi.log.error('Error in option-value find:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async findOne(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Option value documentId is required');
        }

        // Use Document Service API with documentId
        const optionValue = await strapi
          .documents('api::option-value.option-value')
          .findOne({
            documentId,
            populate: ['optionGroup', 'variants'],
          });

        if (!optionValue) {
          return ctx.notFound('Option value not found');
        }

        return optionValue;
      } catch (error) {
        strapi.log.error('Error in option-value findOne:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data.value || !data.displayName || !data.optionGroup) {
          return ctx.badRequest(
            'Value, display name, and option group are required'
          );
        }

        // Use Document Service API for creation
        const optionValue = await strapi
          .documents('api::option-value.option-value')
          .create({
            data,
            populate: ['optionGroup', 'variants'],
          });

        return optionValue;
      } catch (error) {
        strapi.log.error('Error in option-value create:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async update(ctx) {
      try {
        const { documentId } = ctx.params;
        const { data } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Option value documentId is required');
        }

        // Use Document Service API for updates
        const optionValue = await strapi
          .documents('api::option-value.option-value')
          .update({
            documentId,
            data,
            populate: ['optionGroup', 'variants'],
          });

        return optionValue;
      } catch (error) {
        strapi.log.error('Error in option-value update:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async delete(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Option value documentId is required');
        }

        // Check if option value is used in variants
        const optionValue = await strapi
          .documents('api::option-value.option-value')
          .findOne({
            documentId,
            populate: ['variants'],
          });

        if (optionValue && optionValue.variants.length > 0) {
          return ctx.badRequest(
            'Cannot delete option value that is used in variants'
          );
        }

        // Use Document Service API for deletion
        await strapi.documents('api::option-value.option-value').delete({
          documentId,
        });

        return { message: 'Option value deleted successfully' };
      } catch (error) {
        strapi.log.error('Error in option-value delete:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get option values by option group
    async findByOptionGroup(ctx) {
      try {
        const { optionGroupId } = ctx.params;
        const { query } = ctx;

        if (!optionGroupId) {
          return ctx.badRequest('Option group ID is required');
        }

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          optionGroup: optionGroupId,
          status: 'published',
        } as any;

        const optionValues = await strapi
          .documents('api::option-value.option-value')
          .findMany({
            filters,
            sort: { sortOrder: 'asc' },
            populate: ['optionGroup'],
          });

        return optionValues;
      } catch (error) {
        strapi.log.error('Error in option-value findByOptionGroup:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get active option values
    async findActive(ctx) {
      try {
        const { query } = ctx;

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          isActive: true,
          status: 'published',
        } as any;

        const optionValues = await strapi
          .documents('api::option-value.option-value')
          .findMany({
            filters,
            sort: { sortOrder: 'asc' },
            populate: ['optionGroup'],
          });

        return optionValues;
      } catch (error) {
        strapi.log.error('Error in option-value findActive:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get option values by product listing
    async findByProductListing(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { query } = ctx;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        // Get the product listing to find its option groups
        const productListing = await strapi
          .documents('api::product-listing.product-listing')
          .findOne({
            documentId: productListingId,
            populate: ['optionGroups'],
          });

        if (!productListing) {
          return ctx.notFound('Product listing not found');
        }

        const optionGroupIds = productListing.optionGroups.map(
          og => og.documentId
        );

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          optionGroup: { $in: optionGroupIds },
          status: 'published',
        } as any;

        const optionValues = await strapi
          .documents('api::option-value.option-value')
          .findMany({
            filters,
            sort: { sortOrder: 'asc' },
            populate: ['optionGroup'],
          });

        return optionValues;
      } catch (error) {
        strapi.log.error('Error in option-value findByProductListing:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to create multiple option values
    async bulkCreate(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data) {
          return ctx.badRequest('Option values data is required');
        }

        if (!Array.isArray(data)) {
          return ctx.badRequest('Option values data must be an array');
        }

        const created = [];
        const errors = [];
        let successCount = 0;

        for (const optionValueData of data) {
          try {
            if (
              !optionValueData.value ||
              !optionValueData.displayName ||
              !optionValueData.optionGroup
            ) {
              errors.push('Value, display name, and option group are required');
              continue;
            }

            const optionValue = await strapi
              .documents('api::option-value.option-value')
              .create({
                data: {
                  ...optionValueData,
                  sortOrder: optionValueData.sortOrder || 1,
                },
                populate: ['optionGroup', 'variants'],
              });

            created.push(optionValue);
            successCount++;
          } catch (error) {
            errors.push(`Failed to create option value: ${error.message}`);
          }
        }

        return {
          success: successCount,
          errors,
          created,
        };
      } catch (error) {
        strapi.log.error('Error in option-value bulkCreate:', error);
        return ctx.internalServerError('Internal server error');
      }
    },
  })
);
