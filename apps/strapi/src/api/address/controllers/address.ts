/**
 * address controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::address.address', ({ strapi }) => ({
  /**
   * Get addresses by type for the authenticated user
   */
  async findByType(ctx) {
    try {
      const { user } = ctx.state;
      const { type } = ctx.params;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!type || !['shipping', 'billing', 'both'].includes(type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }

      const addresses = await strapi.service('api::address.address').findByUserAndType(user.id, type);

      return {
        data: addresses,
        meta: {
          count: addresses.length,
          type
        }
      };
    } catch (error) {
      strapi.log.error('Error in findByType:', error);
      return ctx.internalServerError('Failed to fetch addresses');
    }
  },

  /**
   * Get default address for the authenticated user by type
   */
  async getDefault(ctx) {
    try {
      const { user } = ctx.state;
      const { type } = ctx.params;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!type || !['shipping', 'billing', 'both'].includes(type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }

      const address = await strapi.service('api::address.address').getDefaultAddress(user.id, type);

      return {
        data: address,
        meta: {
          type
        }
      };
    } catch (error) {
      strapi.log.error('Error in getDefault:', error);
      return ctx.internalServerError('Failed to fetch default address');
    }
  },

  /**
   * Set an address as default for its type
   */
  async setAsDefault(ctx) {
    try {
      const { user } = ctx.state;
      const { documentId } = ctx.params;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!documentId) {
        return ctx.badRequest('Address documentId is required');
      }

      const address = await strapi.service('api::address.address').setAsDefault(documentId, user.id);

      return {
        data: address,
        meta: {
          message: 'Address set as default successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in setAsDefault:', error);
      
      if (error.message === 'Address not found') {
        return ctx.notFound('Address not found');
      }
      
      if (error.message === 'Unauthorized to modify this address') {
        return ctx.forbidden('Unauthorized to modify this address');
      }

      return ctx.internalServerError('Failed to set address as default');
    }
  },

  /**
   * Create a new address for the authenticated user
   */
  async create(ctx) {
    try {
      const { user } = ctx.state;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!data) {
        return ctx.badRequest('Address data is required');
      }

      // Validate required fields
      const requiredFields = ['type', 'firstName', 'lastName', 'address1', 'city', 'state', 'postalCode', 'country', 'phone'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return ctx.badRequest(`${field} is required`);
        }
      }

      // Validate address type
      if (!['shipping', 'billing', 'both'].includes(data.type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }

      const address = await strapi.service('api::address.address').createAddress(data, user.id);

      return {
        data: address,
        meta: {
          message: 'Address created successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in create:', error);
      return ctx.internalServerError('Failed to create address');
    }
  },

  /**
   * Update an existing address
   */
  async update(ctx) {
    try {
      const { user } = ctx.state;
      const { documentId } = ctx.params;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!documentId) {
        return ctx.badRequest('Address documentId is required');
      }

      if (!data) {
        return ctx.badRequest('Address data is required');
      }

      // Validate address type if provided
      if (data.type && !['shipping', 'billing', 'both'].includes(data.type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }

      const address = await strapi.service('api::address.address').updateAddress(documentId, data, user.id);

      return {
        data: address,
        meta: {
          message: 'Address updated successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in update:', error);
      
      if (error.message === 'Address not found') {
        return ctx.notFound('Address not found');
      }
      
      if (error.message === 'Unauthorized to modify this address') {
        return ctx.forbidden('Unauthorized to modify this address');
      }

      return ctx.internalServerError('Failed to update address');
    }
  },

  /**
   * Delete an address
   */
  async delete(ctx) {
    try {
      const { user } = ctx.state;
      const { documentId } = ctx.params;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!documentId) {
        return ctx.badRequest('Address documentId is required');
      }

      const result = await strapi.service('api::address.address').deleteAddress(documentId, user.id);

      return {
        data: result,
        meta: {
          message: 'Address deleted successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in delete:', error);
      
      if (error.message === 'Address not found') {
        return ctx.notFound('Address not found');
      }
      
      if (error.message === 'Unauthorized to delete this address') {
        return ctx.forbidden('Unauthorized to delete this address');
      }

      return ctx.internalServerError('Failed to delete address');
    }
  },

  /**
   * Search addresses with filters
   */
  async search(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Extract filters from query
      const filters: any = {};
      if (query.type) filters.type = query.type;
      if (query.city) filters.city = { $contains: query.city };
      if (query.state) filters.state = { $contains: query.state };
      if (query.country) filters.country = { $contains: query.country };
      if (query.isDefault !== undefined) filters.isDefault = query.isDefault === 'true';

      const addresses = await strapi.service('api::address.address').searchAddresses(user.id, filters);

      return {
        data: addresses,
        meta: {
          count: addresses.length,
          filters: Object.keys(filters)
        }
      };
    } catch (error) {
      strapi.log.error('Error in search:', error);
      return ctx.internalServerError('Failed to search addresses');
    }
  },

  /**
   * Get address statistics for the authenticated user
   */
  async getStats(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Get counts by type
      const shippingCount = await strapi.documents('api::address.address').count({
        filters: {
          user: { id: user.id },
          type: { $in: ['shipping', 'both'] }
        }
      });
      const billingCount = await strapi.documents('api::address.address').count({
        filters: {
          user: { id: user.id },
          type: { $in: ['billing', 'both'] }
        }
      });

      const totalCount = await strapi.documents('api::address.address').count({
        filters: {
          user: { id: user.id }
        }
      });

      const defaultCount = await strapi.documents('api::address.address').count({
        filters: {
          user: { id: user.id },
          isDefault: true
        }
      });

      return {
        data: {
          total: totalCount,
          shipping: shippingCount,
          billing: billingCount,
          defaults: defaultCount
        },
        meta: {
          message: 'Address statistics retrieved successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in getStats:', error);
      return ctx.internalServerError('Failed to get address statistics');
    }
  },

  /**
   * Validate address data
   */
  async validate(ctx) {
    try {
      const { data } = ctx.request.body;

      if (!data) {
        return ctx.badRequest('Address data is required');
      }

      const validationService = strapi.service('api::address.validation');
      const result = validationService.validateAddress(data);

      return {
        data: result,
        meta: {
          message: result.isValid ? 'Address is valid' : 'Address validation failed'
        }
      };
    } catch (error) {
      strapi.log.error('Error in validate:', error);
      return ctx.internalServerError('Failed to validate address');
    }
  },

  /**
   * Validate address for specific country
   */
  async validateForCountry(ctx) {
    try {
      const { data } = ctx.request.body;
      const { country } = ctx.params;

      if (!data) {
        return ctx.badRequest('Address data is required');
      }

      if (!country) {
        return ctx.badRequest('Country is required');
      }

      const validationService = strapi.service('api::address.validation');
      const result = validationService.validateAddressForCountry(data, country);

      return {
        data: result,
        meta: {
          message: result.isValid ? 'Address is valid for country' : 'Address validation failed for country',
          country
        }
      };
    } catch (error) {
      strapi.log.error('Error in validateForCountry:', error);
      return ctx.internalServerError('Failed to validate address for country');
    }
  },

  /**
   * Format address data
   */
  async format(ctx) {
    try {
      const { data } = ctx.request.body;

      if (!data) {
        return ctx.badRequest('Address data is required');
      }

      const validationService = strapi.service('api::address.validation');
      const formattedAddress = validationService.formatAddress(data);

      return {
        data: formattedAddress,
        meta: {
          message: 'Address formatted successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in format:', error);
      return ctx.internalServerError('Failed to format address');
    }
  },

  /**
   * Get address book for user
   */
  async getAddressBook(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const options = {
        page: parseInt(String(query.page)) || 1,
        pageSize: parseInt(String(query.pageSize)) || 25,
        sortBy: String(query.sortBy) || 'createdAt',
        sortOrder: String(query.sortOrder) || 'desc'
      };

      const addressBook = await strapi.service('api::address.address').getAddressBook(user.id, options);

      return {
        data: addressBook,
        meta: {
          message: 'Address book retrieved successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in getAddressBook:', error);
      return ctx.internalServerError('Failed to get address book');
    }
  },

  /**
   * Export addresses
   */
  async exportAddresses(ctx) {
    try {
      const { user } = ctx.state;
      const { format = 'json' } = ctx.query;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!['json', 'csv'].includes(String(format))) {
        return ctx.badRequest('Invalid format. Must be json or csv');
      }

      const exportedData = await strapi.service('api::address.address').exportAddresses(user.id, format);

      if (format === 'csv') {
        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', `attachment; filename="addresses-${new Date().toISOString().split('T')[0]}.csv"`);
        return exportedData;
      }

      return {
        data: exportedData,
        meta: {
          message: 'Addresses exported successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in exportAddresses:', error);
      return ctx.internalServerError('Failed to export addresses');
    }
  },

  /**
   * Import addresses
   */
  async importAddresses(ctx) {
    try {
      const { user } = ctx.state;
      const { addresses } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!addresses || !Array.isArray(addresses)) {
        return ctx.badRequest('Addresses array is required');
      }

      if (addresses.length === 0) {
        return ctx.badRequest('At least one address is required');
      }

      if (addresses.length > 100) {
        return ctx.badRequest('Maximum 100 addresses can be imported at once');
      }

      const results = await strapi.service('api::address.address').importAddresses(user.id, addresses);

      return {
        data: results,
        meta: {
          message: `Import completed. ${results.success} successful, ${results.errors} errors`
        }
      };
    } catch (error) {
      strapi.log.error('Error in importAddresses:', error);
      return ctx.internalServerError('Failed to import addresses');
    }
  },

  /**
   * Get address analytics
   */
  async getAnalytics(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const analytics = await strapi.service('api::address.address').getAddressAnalytics(user.id);

      return {
        data: analytics,
        meta: {
          message: 'Address analytics retrieved successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error in getAnalytics:', error);
      return ctx.internalServerError('Failed to get address analytics');
    }
  }
}));
