/**
 * product-listing controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::product-listing.product-listing',
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const { query } = ctx;

        // Validate and apply filters with improved error handling
        const filters: any = {
          ...(query?.filters && typeof query.filters === 'object'
            ? query.filters
            : {}),
          status: 'published',
        } as any;

        // Validate and apply sorting
        const sort =
          query?.sort && typeof query.sort === 'object'
            ? query.sort
            : { createdAt: 'desc' };

        // Validate and apply pagination with improved validation
        const page = Math.max(1, parseInt(String(query?.page || '1')) || 1);
        const pageSize = Math.min(
          Math.max(1, parseInt(String(query?.pageSize || '25')) || 25),
          100
        );

        const pagination = { page, pageSize };

        // Use Document Service API
        const productListings = await strapi
          .documents('api::product-listing.product-listing')
          .findMany({
            filters,
            sort,
            pagination,
            populate: [
              'images',
              'category',
              'product',
              'variants',
              'optionGroups',
            ],
          });

        return productListings;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing find:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    async findOne(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Product listing documentId is required');
        }

        // Use Document Service API with documentId
        const productListing = await strapi
          .documents('api::product-listing.product-listing')
          .findOne({
            documentId,
            populate: [
              'images',
              'category',
              'product',
              'variants',
              'optionGroups',
            ],
          });

        if (!productListing) {
          return ctx.notFound('Product listing not found');
        }

        return productListing;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing findOne:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data.title || !data.product) {
          return ctx.badRequest('Title and product are required');
        }

        // Use Document Service API for creation
        const productListing = await strapi
          .documents('api::product-listing.product-listing')
          .create({
            data,
            populate: [
              'images',
              'category',
              'product',
              'variants',
              'optionGroups',
            ],
          });

        return productListing;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing create:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    async update(ctx) {
      try {
        const { documentId } = ctx.params;
        const { data } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Product listing documentId is required');
        }

        // Use Document Service API for updates
        const productListing = await strapi
          .documents('api::product-listing.product-listing')
          .update({
            documentId,
            data,
            populate: [
              'images',
              'category',
              'product',
              'variants',
              'optionGroups',
            ],
          });

        return productListing;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing update:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    async delete(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Product listing documentId is required');
        }

        // Use Document Service API for deletion
        await strapi.documents('api::product-listing.product-listing').delete({
          documentId,
        });

        return { message: 'Product listing deleted successfully' };
      } catch (error) {
        strapi.log.error(
          'Error in product-listing delete:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get product listings by type
    async findByType(ctx) {
      try {
        const { type } = ctx.params;
        const { query } = ctx;

        if (!type || !['single', 'variant'].includes(type)) {
          return ctx.badRequest('Valid type (single or variant) is required');
        }

        const filters = {
          ...(query?.filters && typeof query.filters === 'object'
            ? query.filters
            : {}),
          type,
          status: 'published',
        } as any;

        const productListings = await strapi
          .documents('api::product-listing.product-listing')
          .findMany({
            filters,
            sort: { createdAt: 'desc' },
            pagination: { page: 1, pageSize: 25 },
            populate: [
              'images',
              'category',
              'product',
              'variants',
              'optionGroups',
            ],
          });

        return productListings;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing findByType:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },

    // Custom method to get product listing with variants
    async findWithVariants(ctx) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Product listing documentId is required');
        }

        const productListing = await strapi
          .documents('api::product-listing.product-listing')
          .findOne({
            documentId,
            populate: {
              images: true,
              category: true,
              product: true,
              variants: {
                populate: ['optionValues', 'images'],
              },
              optionGroups: {
                populate: ['optionValues'],
              },
            },
          });

        if (!productListing) {
          return ctx.notFound('Product listing not found');
        }

        return productListing;
      } catch (error) {
        strapi.log.error(
          'Error in product-listing findWithVariants:',
          error.message,
          error
        );
        return ctx.internalServerError('Internal server error');
      }
    },
  })
);
