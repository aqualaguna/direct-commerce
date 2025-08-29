/**
 * option-group controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::option-group.option-group',
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
        const optionGroups = await strapi
          .documents('api::option-group.option-group')
          .findMany({
            filters,
            sort,
            pagination,
            populate: ['optionValues', 'productListings'],
          });

        return optionGroups;
      } catch (error) {
        strapi.log.error('Error in option-group find:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async findOne(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Option group documentId is required');
        }

        // Use Document Service API with documentId
        const optionGroup = await strapi
          .documents('api::option-group.option-group')
          .findOne({
            documentId,
            populate: ['optionValues', 'productListings'],
          });

        if (!optionGroup) {
          return ctx.notFound('Option group not found');
        }

        return optionGroup;
      } catch (error) {
        strapi.log.error('Error in option-group findOne:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data.name || !data.displayName) {
          return ctx.badRequest('Name and display name are required');
        }

        // Use Document Service API for creation
        const optionGroup = await strapi
          .documents('api::option-group.option-group')
          .create({
            data,
            populate: ['optionValues', 'productListings'],
          });

        return optionGroup;
      } catch (error) {
        strapi.log.error('Error in option-group create:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async update(ctx) {
      try {
        const { documentId } = ctx.params;
        const { data } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Option group documentId is required');
        }

        // Use Document Service API for updates
        const optionGroup = await strapi
          .documents('api::option-group.option-group')
          .update({
            documentId,
            data,
            populate: ['optionValues', 'productListings'],
          });

        return optionGroup;
      } catch (error) {
        strapi.log.error('Error in option-group update:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async delete(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Option group documentId is required');
        }

        // Check if option group has option values
        const optionGroup = await strapi
          .documents('api::option-group.option-group')
          .findOne({
            documentId,
            populate: ['optionValues'],
          });

        if (optionGroup && optionGroup.optionValues.length > 0) {
          return ctx.badRequest(
            'Cannot delete option group with existing option values'
          );
        }

        // Use Document Service API for deletion
        await strapi.documents('api::option-group.option-group').delete({
          documentId,
        });

        return { message: 'Option group deleted successfully' };
      } catch (error) {
        strapi.log.error('Error in option-group delete:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get option groups by product listing
    async findByProductListing(ctx) {
      try {
        const { productListingId } = ctx.params;
        const { query } = ctx;

        if (!productListingId) {
          return ctx.badRequest('Product listing ID is required');
        }

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          productListings: productListingId,
          status: 'published',
        } as any;

        const optionGroups = await strapi
          .documents('api::option-group.option-group')
          .findMany({
            filters,
            sort: { sortOrder: 'asc' },
            populate: ['optionValues'],
          });

        return optionGroups;
      } catch (error) {
        strapi.log.error('Error in option-group findByProductListing:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get active option groups
    async findActive(ctx) {
      try {
        const { query } = ctx;

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          isActive: true,
          status: 'published',
        } as any;

        const optionGroups = await strapi
          .documents('api::option-group.option-group')
          .findMany({
            filters,
            sort: { sortOrder: 'asc' },
            populate: ['optionValues'],
          });

        return optionGroups;
      } catch (error) {
        strapi.log.error('Error in option-group findActive:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to create option group with default values
    async createWithDefaultValues(ctx) {
      try {
        const { data } = ctx.request.body;
        const { createDefaults = 'true' } = ctx.query;

        if (!data.name || !data.displayName) {
          return ctx.badRequest('Name and display name are required');
        }

        // Create the option group
        const optionGroup = await strapi
          .documents('api::option-group.option-group')
          .create({
            data,
            populate: ['optionValues', 'productListings'],
          });

        // Create default option values if requested
        let defaultValues = [];
        if (
          createDefaults === 'true' &&
          data.defaultValues &&
          Array.isArray(data.defaultValues)
        ) {
          const managementService = strapi.service(
            'api::option-group.option-group-management'
          ) as any;
          defaultValues = await managementService.createDefaultOptionValues(
            optionGroup.documentId,
            data.defaultValues
          );
        }

        return {
          optionGroup,
          defaultValues,
        };
      } catch (error) {
        strapi.log.error(
          'Error in option-group createWithDefaultValues:',
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },
  })
);
