/**
 * Product validation middleware
 */

// Remove Strapi import as it's not needed

interface ValidationError {
  field: string;
  message: string;
}

interface ProductData {
  title?: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  comparePrice?: number;
  sku?: string;
  inventory?: number;
  isActive?: boolean;
  featured?: boolean;
  category?: number;
}

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    try {
      const { data } = ctx.request.body;

      if (!data) {
        return ctx.badRequest('Product data is required');
      }

      const errors: ValidationError[] = [];

      // Required field validation
      const requiredFields = [
        'title',
        'description',
        'shortDescription',
        'price',
        'sku',
        'inventory',
      ];
      for (const field of requiredFields) {
        if (!data[field]) {
          errors.push({
            field,
            message: `${field} is required`,
          });
        }
      }

      // Title validation
      if (data.title) {
        if (typeof data.title !== 'string') {
          errors.push({
            field: 'title',
            message: 'Title must be a string',
          });
        } else if (data.title.trim().length === 0) {
          errors.push({
            field: 'title',
            message: 'Title cannot be empty',
          });
        } else if (data.title.length > 255) {
          errors.push({
            field: 'title',
            message: 'Title must be 255 characters or less',
          });
        }
      }

      // Description validation
      if (data.description) {
        if (typeof data.description !== 'string') {
          errors.push({
            field: 'description',
            message: 'Description must be a string',
          });
        } else if (data.description.trim().length === 0) {
          errors.push({
            field: 'description',
            message: 'Description cannot be empty',
          });
        }
      }

      // Short description validation
      if (data.shortDescription) {
        if (typeof data.shortDescription !== 'string') {
          errors.push({
            field: 'shortDescription',
            message: 'Short description must be a string',
          });
        } else if (data.shortDescription.length > 500) {
          errors.push({
            field: 'shortDescription',
            message: 'Short description must be 500 characters or less',
          });
        }
      }

      // Price validation
      if (data.price !== undefined) {
        if (typeof data.price !== 'number') {
          errors.push({
            field: 'price',
            message: 'Price must be a number',
          });
        } else if (data.price <= 0) {
          errors.push({
            field: 'price',
            message: 'Price must be greater than 0',
          });
        } else if (data.price > 999999.99) {
          errors.push({
            field: 'price',
            message: 'Price cannot exceed 999,999.99',
          });
        }
      }

      // Compare price validation
      if (data.comparePrice !== undefined) {
        if (typeof data.comparePrice !== 'number') {
          errors.push({
            field: 'comparePrice',
            message: 'Compare price must be a number',
          });
        } else if (data.comparePrice <= 0) {
          errors.push({
            field: 'comparePrice',
            message: 'Compare price must be greater than 0',
          });
        } else if (data.price && data.comparePrice <= data.price) {
          errors.push({
            field: 'comparePrice',
            message: 'Compare price must be greater than regular price',
          });
        }
      }

      // SKU validation
      if (data.sku) {
        if (typeof data.sku !== 'string') {
          errors.push({
            field: 'sku',
            message: 'SKU must be a string',
          });
        } else if (data.sku.trim().length === 0) {
          errors.push({
            field: 'sku',
            message: 'SKU cannot be empty',
          });
        } else if (data.sku.length > 100) {
          errors.push({
            field: 'sku',
            message: 'SKU must be 100 characters or less',
          });
        } else if (!/^[A-Za-z0-9\-_]+$/.test(data.sku)) {
          errors.push({
            field: 'sku',
            message:
              'SKU can only contain letters, numbers, hyphens, and underscores',
          });
        }
      }

      // Inventory validation
      if (data.inventory !== undefined) {
        if (
          typeof data.inventory !== 'number' ||
          !Number.isInteger(data.inventory)
        ) {
          errors.push({
            field: 'inventory',
            message: 'Inventory must be an integer',
          });
        } else if (data.inventory < 0) {
          errors.push({
            field: 'inventory',
            message: 'Inventory cannot be negative',
          });
        } else if (data.inventory > 999999) {
          errors.push({
            field: 'inventory',
            message: 'Inventory cannot exceed 999,999',
          });
        }
      }

      // Boolean field validation
      if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
        errors.push({
          field: 'isActive',
          message: 'isActive must be a boolean',
        });
      }

      if (data.featured !== undefined && typeof data.featured !== 'boolean') {
        errors.push({
          field: 'featured',
          message: 'featured must be a boolean',
        });
      }

      // Category validation
      if (data.category !== undefined) {
        if (
          typeof data.category !== 'number' ||
          !Number.isInteger(data.category)
        ) {
          errors.push({
            field: 'category',
            message: 'Category must be a valid ID',
          });
        } else {
          // Check if category exists
          try {
            const category = await strapi.entityService.findOne(
              'api::category.category',
              data.category
            );
            if (!category) {
              errors.push({
                field: 'category',
                message: 'Category does not exist',
              });
            }
          } catch (error) {
            errors.push({
              field: 'category',
              message: 'Invalid category ID',
            });
          }
        }
      }

      // SKU uniqueness validation (only for create operations)
      if (data.sku && ctx.request.method === 'POST') {
        try {
          const existingProduct = await strapi.entityService.findMany(
            'api::product.product',
            {
              filters: { sku: data.sku },
            }
          );

          if (existingProduct.length > 0) {
            errors.push({
              field: 'sku',
              message: 'SKU must be unique',
            });
          }
        } catch (error) {
          strapi.log.error('Error checking SKU uniqueness:', error);
        }
      }

      // SKU uniqueness validation for update operations
      if (data.sku && ctx.request.method === 'PUT' && ctx.params.id) {
        try {
          const existingProduct = await strapi.entityService.findOne(
            'api::product.product',
            ctx.params.id
          );
          if (existingProduct && existingProduct.sku !== data.sku) {
            const skuExists = await strapi.entityService.findMany(
              'api::product.product',
              {
                filters: { sku: data.sku },
              }
            );

            if (skuExists.length > 0) {
              errors.push({
                field: 'sku',
                message: 'SKU must be unique',
              });
            }
          }
        } catch (error) {
          strapi.log.error('Error checking SKU uniqueness for update:', error);
        }
      }

      if (errors.length > 0) {
        return ctx.badRequest('Validation failed', {
          errors,
        });
      }

      await next();
    } catch (error) {
      strapi.log.error('Error in product validation middleware:', error);
      return ctx.badRequest('Validation error occurred');
    }
  };
};
