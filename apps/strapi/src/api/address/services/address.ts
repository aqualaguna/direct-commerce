/**
 * address service
 */

import { factories } from '@strapi/strapi';
import { UserType } from '../../../../config/constant';

export default factories.createCoreService('api::address.address', ({ strapi }) => ({
  /**
   * Find addresses by user  and type
   */
  async findByUserAndType(userType: UserType, userId: string, type: 'shipping' | 'billing' | 'both') {
    try {
      const filters: any = {
        type: type === 'both' ? { $in: ['shipping', 'billing', 'both'] } : type
      };
      if (userType === UserType.AUTHENTICATED) {
        filters.user = { id: userId };
      } else if (userType === UserType.GUEST) {
        filters.sessionId = userId;
      }
      const addresses = await strapi.documents('api::address.address').findMany({
        filters,
        sort: { isDefault: 'desc', createdAt: 'desc' },
        populate: ['user']
      });
      
      return addresses;
    } catch (error) {
      strapi.log.error('Error finding addresses by user and type:', error);
      throw error;
    }
  },

  /**
   * Get default address for user by type
   */
  async getDefaultAddress(userId: string, userType: UserType, type: 'shipping' | 'billing' | 'both') {
    try {
      const filters: any = {
        isDefault: true,
        type: type === 'both' ? { $in: ['shipping', 'billing', 'both'] } : type
      };
      if (userType === UserType.AUTHENTICATED) {
        filters.user = { id: userId };
      } else if (userType === UserType.GUEST) {
        filters.sessionId = userId;
      }
      const addresses = await strapi.documents('api::address.address').findMany({
        filters,
        sort: { createdAt: 'desc' },
        populate: ['user']
      });
      
      return addresses.length > 0 ? addresses[0] : null;
    } catch (error) {
      strapi.log.error('Error getting default address:', error);
      throw error;
    }
  },

  /**
   * Set address as default for its type
   */
  async setAsDefault(documentId: string, userId: string, userType: UserType) {
    try {
      // Get the address to determine its type
      const address = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['user']
      });

      if (!address) {
        throw new Error('Address not found');
      }

      if (userType === UserType.AUTHENTICATED && address.user.id !== userId) {
        throw new Error('Unauthorized to modify this address');
      }
      if (userType === UserType.GUEST && address.sessionId !== userId) {
        throw new Error('Unauthorized to modify this address');
      }
      const where: any =  {
        isDefault: true,
        type: address.type,
        documentId: { $ne: documentId }
      }
      if (userType === UserType.AUTHENTICATED) {
        where.user = userId;
      } else if (userType === UserType.GUEST) {
        where.sessionId = userId;
        where.user = {$null: true};
      }
      // Remove default flag from other addresses of the same type
      const otherAddresses = await strapi.db.query('api::address.address').findMany({
        where
      });

      // Update each address individually
      for (const otherAddress of otherAddresses) {
        await strapi.documents('api::address.address').update({
          documentId: otherAddress.documentId,
          data: {
            isDefault: false
          }
        });
      }
      // Set this address as default
      const updatedAddress = await strapi.documents('api::address.address').update({
        documentId,
        data: {
          isDefault: true
        },
        populate: ['user']
      });
      return updatedAddress;
    } catch (error) {
      strapi.log.error('Error setting address as default:', error);
      throw error;
    }
  },

  /**
   * Create address with default handling
   */
  async createAddress(data: any, userId: string, userType: UserType) {
    try {
      // If this is the first address of its type, make it default
      const existingAddresses = await this.findByUserAndType(userType, userId, data.type);
      
      if (existingAddresses.length === 0) {
        data.isDefault = true;
      } else if (data.isDefault) {
        // Remove default flag from other addresses of the same type
        const where: any = {
          user: userId,
          isDefault: true,
          type: data.type
        }
        if (userType === UserType.GUEST) {
          where.sessionId = userId;
          where.user = {$null: true};
        }
        await strapi.db.query('api::address.address').updateMany({
          where,
          data: {
            isDefault: false
          }
        });
      }

      // Add user to the data
      data[userType === UserType.AUTHENTICATED ? 'user' : 'sessionId'] = userId;
      const address = await strapi.documents('api::address.address').create({
        data,
        populate: ['user']
      });

      return address;
    } catch (error) {
      strapi.log.error('Error creating address:', error);
      throw error;
    }
  },

  /**
   * Update address with default handling
   */
  async updateAddress(documentId: string, data: any, userId: string, userType: UserType) {
    try {
      // Get the current address
      const currentAddress = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['user']
      });

      if (!currentAddress) {
        throw new Error('Address not found');
      }
      if (userType === UserType.AUTHENTICATED && (currentAddress.user.id !== userId || (data.user && data.user !== userId))) {
        throw new Error('Unauthorized to modify this address');
      }
      if (userType === UserType.GUEST && currentAddress.sessionId !== userId) {  
        throw new Error('Unauthorized to modify this address');
      }

      // Handle default address logic
      if (data.isDefault && !currentAddress.isDefault) {
        // Remove default flag from other addresses of the same type
        const where: any = {
          user: userId,
          isDefault: true,
          type: currentAddress.type,
          documentId: { $ne: documentId }
        }
        if (userType === UserType.GUEST) {
          where.sessionId = userId;
          where.user = {$null: true};
        }
        if(userType === UserType.API_TOKEN) {
          if(currentAddress.user) {
            where.user = currentAddress.user.id;
          } else {
            where.sessionId = currentAddress.sessionId;
            where.user = {$null: true};
          }
        }
        await strapi.db.query('api::address.address').updateMany({
          where,
          data: {
            isDefault: false
          }
        });
      }

      const updatedAddress = await strapi.documents('api::address.address').update({
        documentId,
        data,
        populate: ['user']
      });

      return updatedAddress;
    } catch (error) {
      strapi.log.error('Error updating address:', error);
      throw error;
    }
  },

  /**
   * Delete address with default handling
   */
  async deleteAddress(documentId: string, userId: string, userType: UserType) {
    try {
      // Get the address to check if it's default
      const address = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['user']
      });

      if (!address) {
        throw new Error('Address not found');
      }

      if (userType === UserType.AUTHENTICATED && address.user.id !== userId) {
        throw new Error('Unauthorized to delete this address');
      }
      
      if (userType === UserType.GUEST && address.sessionId !== userId) {
        throw new Error('Unauthorized to delete this address');
      }

      // Delete the address
      await strapi.documents('api::address.address').delete({
        documentId
      });

      // If it was the default address, set another address as default
      if (address.isDefault) {
        const filters: any = {
          user: userId,
          type: address.type,
          documentId: { $ne: documentId }
        }
        if (userType === UserType.GUEST) {
          filters.sessionId = userId;
          filters.user = {$null: true};
        }
        if (userType === UserType.API_TOKEN) {
          if (address.user) {
            filters.user = address.user.id;
          } else {
            filters.sessionId = address.sessionId;
            filters.user = {$null: true};
          }
        }
        const nextDefault = await strapi.documents('api::address.address').findFirst({
          filters
        });

        if (nextDefault) {
          await strapi.documents('api::address.address').update({
            documentId: nextDefault.documentId,
            data: {
              isDefault: true
            }
          });
        }
      }

      return { success: true, message: 'Address deleted successfully' };
    } catch (error) {
      strapi.log.error('Error deleting address:', error);
      throw error;
    }
  },

  /**
   * Search addresses by user with filters
   */
  async searchAddresses(userId: string, userType: UserType, filters: any = {}) {
    try {
      const queryFilters = {
        ...filters,
        user: userType === UserType.AUTHENTICATED ? { id: userId } : {$null: true},
        sessionId: userType === UserType.GUEST ? userId : {$null: true},
      };

      const addresses = await strapi.documents('api::address.address').findMany({
        filters: queryFilters,
        sort: { isDefault: 'desc', createdAt: 'desc' },
        populate: ['user']
      });

      return addresses;
    } catch (error) {
      strapi.log.error('Error searching addresses:', error);
      throw error;
    }
  },

  /**
   * Get address book for user with organization features
   */
  async getAddressBook(userId: string, userType: UserType, options: any = {}) {
    try {
      const { start = 0, limit = 25, sort = 'createdAt:desc' } = options;

      const addresses = await strapi.documents('api::address.address').findMany({
        filters: {
          user: userType === UserType.AUTHENTICATED ? { id: userId } : {$null: true},
          sessionId: userType === UserType.GUEST ? userId : {$null: true}
        },
        sort,
        limit,
        start,
        populate: ['user']
      });

      // Group addresses by type for organization
      const groupedAddresses = {
        shipping: addresses.filter(addr => ['shipping', 'both'].includes(addr.type)),
        billing: addresses.filter(addr => ['billing', 'both'].includes(addr.type)),
        all: addresses
      };

      return {
        addresses: groupedAddresses,
        stats: {
          total: addresses.length,
          shipping: groupedAddresses.shipping.length,
          billing: groupedAddresses.billing.length,
          defaults: addresses.filter(addr => addr.isDefault).length
        }
      };
    } catch (error) {
      strapi.log.error('Error getting address book:', error);
      throw error;
    }
  },

  /**
   * Export addresses for user
   */
  async exportAddresses(userId: string, userType: UserType, format: 'json' | 'csv' = 'json') {
    try {
      const addresses = await strapi.documents('api::address.address').findMany({
        filters: {
          user: userType === UserType.AUTHENTICATED ? { id: userId } : {$null: true},
          sessionId: userType === UserType.GUEST ? userId : {$null: true}
        },
        sort: { isDefault: 'desc', createdAt: 'desc' },
        populate: ['user']
      });

      if (format === 'csv') {
        return this.convertToCSV(addresses);
      }

      return {
        format: 'json',
        data: addresses,
        exportedAt: new Date().toISOString(),
        count: addresses.length
      };
    } catch (error) {
      strapi.log.error('Error exporting addresses:', error);
      throw error;
    }
  },

  /**
   * Import addresses for user
   */
  async importAddresses(userId: string, addresses: any[], userType: UserType) {
    try {
      const results = {
        success: 0,
        errors: 0,
        errorsList: [] as any[]
      };

      for (const addressData of addresses) {
        try {
          // Validate address data
          const validationService = strapi.service('api::address.validation');
          const validation = validationService.validateAddress(addressData);

          if (!validation.isValid) {
            results.errors++;
            results.errorsList.push({
              address: addressData,
              errors: validation.errors
            });
            continue;
          }

          // Create address
          await this.createAddress(validation.formattedAddress || addressData, userId, userType);
          results.success++;
        } catch (error) {
          results.errors++;
          results.errorsList.push({
            address: addressData,
            errors: [error.message]
          });
        }
      }

      return results;
    } catch (error) {
      strapi.log.error('Error importing addresses:', error);
      throw error;
    }
  },

  /**
   * Get address analytics for dashboard (all addresses)
   */
  async getAddressAnalytics() {
    try {
      // Get total count
      const totalAddresses = await strapi.documents('api::address.address').count({});

      // Get counts by type using SQL aggregation
      const [shippingCount, billingCount, bothCount, defaultCount] = await Promise.all([
        strapi.documents('api::address.address').count({
          filters: { type: { $in: ['shipping', 'both'] } }
        }),
        strapi.documents('api::address.address').count({
          filters: { type: { $in: ['billing', 'both'] } }
        }),
        strapi.documents('api::address.address').count({
          filters: { type: 'both' }
        }),
        strapi.documents('api::address.address').count({
          filters: { isDefault: true }
        })
      ]);

      // Get recently added addresses (limit to 5)
      const recentlyAdded = await strapi.documents('api::address.address').findMany({
        sort: { createdAt: 'desc' },
        limit: 5,
        populate: ['user']
      });

      // Get country, state, city counts using raw SQL for better performance
      const countryStats = await strapi.db.connection.raw(`
        SELECT country, COUNT(*) as count 
        FROM addresses 
        WHERE country IS NOT NULL 
        GROUP BY country 
        ORDER BY count DESC
      `);

      const stateStats = await strapi.db.connection.raw(`
        SELECT state, COUNT(*) as count 
        FROM addresses 
        WHERE state IS NOT NULL 
        GROUP BY state 
        ORDER BY count DESC
      `);

      const cityStats = await strapi.db.connection.raw(`
        SELECT city, COUNT(*) as count 
        FROM addresses 
        WHERE city IS NOT NULL 
        GROUP BY city 
        ORDER BY count DESC
      `);

      // Convert raw results to objects
      const byCountry: any = {};
      countryStats.rows?.forEach((row: any) => {
        byCountry[row.country] = parseInt(row.count);
      });

      const byState: any = {};
      stateStats.rows?.forEach((row: any) => {
        byState[row.state] = parseInt(row.count);
      });

      const byCity: any = {};
      cityStats.rows?.forEach((row: any) => {
        byCity[row.city] = parseInt(row.count);
      });

      return {
        totalAddresses,
        byType: {
          shipping: shippingCount,
          billing: billingCount,
          both: bothCount
        },
        byCountry,
        byState,
        byCity,
        defaultAddresses: defaultCount,
        recentlyAdded
      };
    } catch (error) {
      strapi.log.error('Error getting address analytics:', error);
      throw error;
    }
  },

  /**
   * Convert addresses to CSV format
   */
  convertToCSV(addresses: any[]): string {
    const headers = [
      'Type', 'First Name', 'Last Name', 'Company', 'Address 1', 'Address 2',
      'City', 'State', 'Postal Code', 'Country', 'Phone', 'Is Default', 'Created At'
    ];

    const rows = addresses.map(addr => [
      addr.type,
      addr.firstName,
      addr.lastName,
      addr.company || '',
      addr.address1,
      addr.address2 || '',
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
      addr.phone,
      addr.isDefault ? 'Yes' : 'No',
      new Date(addr.createdAt).toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}));
