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
        } as any;

        // Apply sorting with validation
        const sort = (query.sort as Record<string, any>) || {
          sortOrder: 'asc',
          createdAt: 'desc',
        };

        // Apply pagination with improved validation
        // Strapi 5 uses pagination[page] and pagination[pageSize] format
        const paginationQuery = query.pagination as any;
        const pagination = {
          page: Math.max(1, parseInt(String(paginationQuery?.page || '1')) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(String(paginationQuery?.pageSize || '25')) || 25),
            100
          ),
        };
        // Use Document Service API
        const result = await strapi
          .documents('api::option-group.option-group')
          .findMany({
            filters,
            sort,
            limit: pagination.pageSize,
            start: (pagination.page - 1) * pagination.pageSize,
            populate: ['optionValues', 'productListings'],
          });

        // Document Service API returns the data directly, not wrapped in a result object
        // We need to format the response to match the expected API format
        const totalCount = await strapi
          .documents('api::option-group.option-group')
          .count({ filters });

        const pageCount = Math.ceil(totalCount / pagination.pageSize);

        return { 
          data: result, 
          meta: { 
            pagination: {
              page: pagination.page,
              pageSize: pagination.pageSize,
              pageCount,
              total: totalCount
            }
          } 
        };
      } catch (error) {
        strapi.log.error('Error in option-group find:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async findOne(ctx) {
      try {
        const { id } = ctx.params;
        const documentId = id || ctx.params.documentId;

        if (!documentId) {
          return ctx.badRequest('Option group documentId is required');
        }

        // Validate documentId format (should be a valid string)
        if (typeof documentId !== 'string' || documentId.trim() === '') {
          return ctx.badRequest('Invalid document ID format');
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

        return { data: optionGroup };
      } catch (error) {
        strapi.log.error('Error in option-group findOne:', error);
        
        // Handle specific error cases
        if (error.message && error.message.includes('not found')) {
          return ctx.notFound('Option group not found');
        }
        
        return ctx.internalServerError('Internal server error');
      }
    },

    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        // Check if data exists
        if (!data) {
          return ctx.badRequest('Request body must contain data');
        }

        // Validate required fields
        if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
          return ctx.badRequest('Name is required and must be a non-empty string');
        }

        if (!data.displayName || typeof data.displayName !== 'string' || data.displayName.trim() === '') {
          return ctx.badRequest('Display name is required and must be a non-empty string');
        }

        // Validate field lengths
        if (data.name.length > 50) {
          return ctx.badRequest('Name must not exceed 50 characters');
        }

        if (data.displayName.length > 100) {
          return ctx.badRequest('Display name must not exceed 100 characters');
        }


        // Validate type if provided
        if (data.type && !['select', 'radio'].includes(data.type)) {
          return ctx.badRequest('Invalid type. Must be one of: select, radio');
        }

        // Check for duplicate name
        const existingOptionGroup = await strapi
          .documents('api::option-group.option-group')
          .findMany({
            filters: { name: data.name.trim() },
            limit: 1,
            start: 0
          });

        if (existingOptionGroup && existingOptionGroup.length > 0) {
          return ctx.badRequest('Option group with this name already exists');
        }

        // Use Document Service API for creation
        const optionGroup = await strapi
          .documents('api::option-group.option-group')
          .create({
            data: data,
            populate: ['optionValues', 'productListings'],
          });
        
        ctx.status = 201;
        return { data: optionGroup };
      } catch (error) {
        strapi.log.error('Error in option-group create:', error);
        
        // Handle validation errors
        if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
          return ctx.badRequest('Option group with this name already exists');
        }
        
        if (error.message && error.message.includes('validation')) {
          return ctx.badRequest(error.message);
        }

        // Handle field length validation errors
        if (error.message && (error.message.includes('maxLength') || error.message.includes('minLength'))) {
          return ctx.badRequest(error.message);
        }

        // Handle enum validation errors
        if (error.message && error.message.includes('enum')) {
          return ctx.badRequest('Invalid type. Must be one of: select, radio');
        }

        // Handle Strapi validation errors
        if (error.name === 'ValidationError' || error.message.includes('must be')) {
          return ctx.badRequest(error.message);
        }

        // Handle database constraint violations
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          return ctx.badRequest('Option group with this name already exists');
        }
        
        return ctx.internalServerError('Internal server error');
      }
    },

    async update(ctx) {
      try {
        const { id } = ctx.params;
        const documentId = id || ctx.params.documentId;
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

        return { data: optionGroup };
      } catch (error) {
        strapi.log.error('Error in option-group update:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    async delete(ctx) {
      try {
        const { id } = ctx.params;
        const documentId = id || ctx.params.documentId;

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
        const result = await strapi.documents('api::option-group.option-group').delete({
          documentId,
        });

        return { data: result, message: 'Option group deleted successfully' };
      } catch (error) {
        strapi.log.error('Error in option-group delete:', error);
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get option groups by product listing
    async findByProductListing(ctx) {
      try {
        const { productListingId } = ctx.params;
        console.log("ctx.params", ctx.params);
        const { query } = ctx;

        if (!productListingId || productListingId === 'missing-id') {
          return ctx.badRequest('Product listing ID is required');
        }

        const filters = {
          ...((query.filters as Record<string, any>) || {}),
          productListings: productListingId,
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
