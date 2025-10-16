/**
 * address controller
 */

import { factories } from '@strapi/strapi';
import { sanitizeAddressData } from '../../../utils';
import { UserType } from '../../../../config/constant';

export default factories.createCoreController('api::address.address', ({ strapi }) => ({
  /**
   * Get addresses by type for the authenticated user
   */
  async findByType(ctx) {
    try {
      const { user, userType } = ctx.state;
      const { type } = ctx.params;
      const sessionId = ctx.query.sessionId;

      if (!type || !['shipping', 'billing', 'both'].includes(type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }

      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const addresses = await strapi.service('api::address.address').findByUserAndType(
        userType,
        userId,
        type);

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
      const { user, userType } = ctx.state;
      const { type } = ctx.params;
      const sessionId = ctx.query.sessionId;

      if (!type || !['shipping', 'billing', 'both'].includes(type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }

      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const address = await strapi.service('api::address.address').getDefaultAddress(
        userId,
        userType,
        type);

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
      const { user, userType } = ctx.state;
      const documentId = ctx.params.documentId || ctx.params.id;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      if (!documentId) {
        return ctx.badRequest('Address documentId is required');
      }
      
      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const address = await strapi.service('api::address.address').setAsDefault(
        documentId, 
        userId, 
        userType);

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
   * Find Many Addresses
   */
  async find(ctx) {
    try {
      const { user, userType } = ctx.state;
      const query: any = this.sanitizeQuery(ctx);
      const { populate } = query;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;

      const paginationQuery = query.pagination as any || { page: '1', pageSize: '25' };
      const pagination = {
        page: Math.max(1, parseInt(String(paginationQuery.page || '1')) || 1),
        pageSize: Math.min(
          Math.max(1, parseInt(String(paginationQuery.pageSize || '25')) || 25),
          100
        ),
      };
      const filters: any = { ...((query.filters as object) || {}) };
      
      if (userType === UserType.AUTHENTICATED) {
        filters.sessionId = { $null: true };
        filters.user = user.id;
      }
      if (userType === UserType.GUEST) {
        filters.sessionId = sessionId;
        filters.user = { $null: true };
      }
      const addresses: any = await strapi.documents('api::address.address').findMany({
        populate: populate ? String(populate).split(',') : undefined as any,
        filters,
        sort: (query.sort as any) || 'createdAt:desc',
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
      });
      const total = await strapi.documents('api::address.address').count({ filters });

      return {
        data: addresses,
        meta: {
          message: 'Addresses found successfully',
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(total / pagination.pageSize),
            total: total
          }
        }
      };
    }
    catch (error) {
      strapi.log.error('Error in findMany:', error);
      return ctx.internalServerError('Failed to find addresses');
    }
  },
  /**
   * Find One Address
   */
  async findOne(ctx) {
    try {
      const { user, userType } = ctx.state;
      const query: any = await this.sanitizeQuery(ctx);
      const { populate } = query;
      const documentId = ctx.params.documentId || ctx.params.id;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;

      const findParams = {
        documentId,
        populate: populate ? String(populate).split(',') : undefined
      }
      if (!findParams.populate) {
        delete findParams.populate;
      }
      const address: any = await strapi.documents('api::address.address').findOne(findParams as any);
      if (!address) {
        return ctx.notFound('Address not found');
      }
      if (userType === UserType.GUEST && address.sessionId !== sessionId) {
        return ctx.forbidden('You can only view your own address');
      }
      if (userType === UserType.AUTHENTICATED && address.user && address.user.id !== user.id) {
        return ctx.forbidden('You can only view your own address');
      }
      return {
        data: address,
        meta: {
          message: 'Address found successfully'
        }
      };

    } catch (error) {
      strapi.log.error('Error in findOne:', error);
      return ctx.internalServerError('Failed to find address');
    }
  },
  /**
   * Create a new address for the authenticated user
   */
  async create(ctx) {
    try {
      const { user, userType } = ctx.state;
      const rawData = ctx.request.body.data;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      if (!rawData) {
        return ctx.badRequest('Address data is required');
      }

      // Sanitize input data to prevent SQL injection and XSS
      const data: any = sanitizeAddressData(rawData, { sanitizeHtmlEnabled: true });

      const validationService = strapi.service('api::address.validation');
      const result = validationService.validateAddress(data);
      if (!result.isValid) {
        return ctx.badRequest("Address validation failed", result.errors);
      }

      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const address = await strapi.service('api::address.address').createAddress(data,
        userId,
        userType);

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
      const { user, userType } = ctx.state;
      const documentId = ctx.params.documentId || ctx.params.id;
      const rawData = ctx.request.body.data;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      

      if (!documentId) {
        return ctx.badRequest('Address documentId is required');
      }

      if (!rawData) {
        return ctx.badRequest('Address data is required');
      }

      // Sanitize input data to prevent SQL injection and XSS
      const data: any = sanitizeAddressData(rawData, { sanitizeHtmlEnabled: true });

      // Validate address type if provided
      if (data.type && !['shipping', 'billing', 'both'].includes(data.type)) {
        return ctx.badRequest('Invalid address type. Must be shipping, billing, or both');
      }
      const userId = userType === UserType.AUTHENTICATED ? user?.id : sessionId;
      const address = await strapi.service('api::address.address').updateAddress(
        documentId,
        data,
        userId,
        userType,
      );

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
      const { user, userType } = ctx.state;
      const documentId = ctx.params.documentId || ctx.params.id;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;

      if (userType === UserType.AUTHENTICATED && sessionId) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
      }

      if (!documentId) {
        return ctx.badRequest('Address documentId is required');
      }
      const userId = userType === UserType.AUTHENTICATED ? user?.id : sessionId;
      const result = await strapi.service('api::address.address').deleteAddress(
        documentId,
        userId,
        userType
      );

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
      const { user, userType } = ctx.state;
      const { query } = ctx;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      if (userType === UserType.AUTHENTICATED && sessionId) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
      }
      
      // Extract filters from query
      const filters: any = {};
      if (query.type) filters.type = query.type;
      if (query.city) filters.city = { $contains: query.city };
      if (query.state) filters.state = { $contains: query.state };
      if (query.country) filters.country = { $contains: query.country };
      if (query.isDefault !== undefined) filters.isDefault = query.isDefault === 'true';

      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const addresses = await strapi.service('api::address.address').searchAddresses(
        userId,
        userType,
        filters);

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
      const { user, userType } = ctx.state;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      if (userType === UserType.AUTHENTICATED && sessionId) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
      }
      
      // Get counts by type
      const shippingCount = await strapi.documents('api::address.address').count({
        filters: {
          user: userType === UserType.GUEST ? { $null: true } : { id: user.id },
          sessionId: userType === UserType.GUEST ? sessionId : { $null: true },
          type: { $in: ['shipping', 'both'] }
        }
      });
      const billingCount = await strapi.documents('api::address.address').count({
        filters: {
          user: userType === UserType.GUEST ? { $null: true } : { id: user.id },
          sessionId: userType === UserType.GUEST ? sessionId : { $null: true },
          type: { $in: ['billing', 'both'] }
        }
      });

      const totalCount = await strapi.documents('api::address.address').count({
        filters: {
          user: userType === UserType.GUEST ? { $null: true } : { id: user.id },
          sessionId: userType === UserType.GUEST ? sessionId : { $null: true },
        }
      });

      const defaultCount = await strapi.documents('api::address.address').count({
        filters: {
          user: userType === UserType.GUEST ? { $null: true } : { id: user.id },
          sessionId: userType === UserType.GUEST ? sessionId : { $null: true },
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
      ctx.status = result.isValid ? 200 : 400;
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
   * Get address book for user
   */
  async getAddressBook(ctx) {
    try {
      const { user, userType } = ctx.state;
      const { query } = ctx;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      if (userType === UserType.AUTHENTICATED && sessionId) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
      }
      const options = {
        limit: 10000,
        start: 0,
        sort: query.sort ? String(query.sort) : 'createdAt:desc',
      };
      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const addressBook = await strapi.service('api::address.address').getAddressBook(
        userId,
        userType,
        options);

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
      const { user, userType } = ctx.state;
      const { format = 'json' } = ctx.query;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      if (userType === UserType.AUTHENTICATED && sessionId) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
      }

      if (!['json', 'csv'].includes(String(format))) {
        return ctx.badRequest('Invalid format. Must be json or csv');
      }

      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const exportedData = await strapi.service('api::address.address').exportAddresses(
        userId,
        userType,
        format);

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
      const { user, userType } = ctx.state;
      const { addresses } = ctx.request.body;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      if (userType === UserType.AUTHENTICATED && sessionId) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
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

      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const results = await strapi.service('api::address.address').importAddresses(
        userId,
        addresses,
        userType
      );

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
      const analytics = await strapi.service('api::address.address').getAddressAnalytics();

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
