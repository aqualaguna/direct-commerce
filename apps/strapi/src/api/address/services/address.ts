/**
 * address service
 */

import { factories } from '@strapi/strapi';
import { AddressOwnerType } from '../utils/types';

export default factories.createCoreService('api::address.address', ({ strapi }) => ({
  /**
   * Find addresses by user  and type
   */
  async findByUserAndType(ownerType: AddressOwnerType, userId: string, type: 'shipping' | 'billing' | 'both') {
    try {
      const filters: any = {
        type: type === 'both' ? { $in: ['shipping', 'billing', 'both'] } : type
      };
      if (ownerType === AddressOwnerType.USER) {
        filters.user = { id: userId };
      } else if (ownerType === AddressOwnerType.GUEST) {
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
  async getDefaultAddress(userId: string, ownerType: AddressOwnerType, type: 'shipping' | 'billing' | 'both') {
    try {
      const filters: any = {
        isDefault: true,
        type: type === 'both' ? { $in: ['shipping', 'billing', 'both'] } : type
      };
      if (ownerType === AddressOwnerType.USER) {
        filters.user = { id: userId };
      } else if (ownerType === AddressOwnerType.GUEST) {
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
  async setAsDefault(documentId: string, userId: string, ownerType: AddressOwnerType) {
    try {
      // Get the address to determine its type
      const address = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['user']
      });

      if (!address) {
        throw new Error('Address not found');
      }

      if (ownerType === AddressOwnerType.USER && address.user.id !== userId) {
        throw new Error('Unauthorized to modify this address');
      }
      if (ownerType  === AddressOwnerType.GUEST && address.sessionId !== userId) {
        throw new Error('Unauthorized to modify this address');
      }
      const where: any =  {
        isDefault: true,
        type: address.type,
        documentId: { $ne: documentId }
      }
      if (ownerType === AddressOwnerType.USER) {
        where.user = userId;
      } else if (ownerType === AddressOwnerType.GUEST) {
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
  async createAddress(data: any, userId: string, ownerType: AddressOwnerType) {
    try {
      // If this is the first address of its type, make it default
      const existingAddresses = await this.findByUserAndType(ownerType, userId, data.type);
      
      if (existingAddresses.length === 0) {
        data.isDefault = true;
      } else if (data.isDefault) {
        // Remove default flag from other addresses of the same type
        const where: any = {
          user: userId,
          isDefault: true,
          type: data.type
        }
        if (ownerType === AddressOwnerType.GUEST) {
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
      data[ownerType === AddressOwnerType.USER ? 'user' : 'sessionId'] = userId;
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
  async updateAddress(documentId: string, data: any, userId: string, ownerType: AddressOwnerType, isApiTokenRequest: boolean = false) {
    try {
      // Get the current address
      const currentAddress = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['user']
      });

      if (!currentAddress) {
        throw new Error('Address not found');
      }
      if (!isApiTokenRequest) {
        if (ownerType === AddressOwnerType.USER && (currentAddress.user.id !== userId || (data.user && data.user !== userId))) {
          throw new Error('Unauthorized to modify this address');
        }
        if (ownerType === AddressOwnerType.GUEST && currentAddress.sessionId !== userId) {  
          throw new Error('Unauthorized to modify this address');
        }
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
        if (ownerType === AddressOwnerType.GUEST) {
          where.sessionId = userId;
          where.user = {$null: true};
        }
        if(isApiTokenRequest) {
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
  async deleteAddress(documentId: string, userId: string, ownerType: AddressOwnerType) {
    try {
      // Get the address to check if it's default
      const address = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['user']
      });

      if (!address) {
        throw new Error('Address not found');
      }

      if (ownerType === AddressOwnerType.USER && address.user.id !== userId) {
        throw new Error('Unauthorized to delete this address');
      }
      if (ownerType === AddressOwnerType.GUEST && address.sessionId !== userId) {
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
        if (ownerType === AddressOwnerType.GUEST) {
          filters.sessionId = userId;
          filters.user = {$null: true};
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
  async searchAddresses(userId: string, ownerType: AddressOwnerType, filters: any = {}) {
    try {
      const queryFilters = {
        ...filters,
        user: ownerType === AddressOwnerType.USER ? { id: userId } : {$null: true},
        sessionId: ownerType === AddressOwnerType.GUEST ? userId : {$null: true},
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
  async getAddressBook(userId: string, ownerType: AddressOwnerType, options: any = {}) {
    try {
      const { start = 0, limit = 25, sort = 'createdAt:desc' } = options;

      const addresses = await strapi.documents('api::address.address').findMany({
        filters: {
          user: ownerType === AddressOwnerType.USER ? { id: userId } : {$null: true},
          sessionId: ownerType === AddressOwnerType.GUEST ? userId : {$null: true}
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
  async exportAddresses(userId: string, ownerType: AddressOwnerType, format: 'json' | 'csv' = 'json') {
    try {
      const addresses = await strapi.documents('api::address.address').findMany({
        filters: {
          user: ownerType === AddressOwnerType.USER ? { id: userId } : {$null: true},
          sessionId: ownerType === AddressOwnerType.GUEST ? userId : {$null: true}
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
  async importAddresses(userId: string, addresses: any[], ownerType: AddressOwnerType) {
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
          await this.createAddress(validation.formattedAddress || addressData, userId, ownerType);
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
   * Get address analytics for user
   */
  async getAddressAnalytics(userId: string, ownerType: AddressOwnerType) {
    try {
      const addresses = await strapi.entityService.findMany('api::address.address', {
        filters: {
          user: ownerType === AddressOwnerType.USER ? { id: userId } : {$null: true},
          sessionId: ownerType === AddressOwnerType.GUEST ? userId : {$null: true}
        },
        populate: ['user']
      });

      // Calculate analytics
      const analytics = {
        totalAddresses: addresses.length,
        byType: {
          shipping: addresses.filter(addr => ['shipping', 'both'].includes(addr.type)).length,
          billing: addresses.filter(addr => ['billing', 'both'].includes(addr.type)).length,
          both: addresses.filter(addr => addr.type === 'both').length
        },
        byCountry: {} as any,
        byState: {} as any,
        byCity: {} as any,
        defaultAddresses: addresses.filter(addr => addr.isDefault).length,
        recentlyAdded: addresses
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      };

      // Count by country, state, city
      addresses.forEach(addr => {
        if (addr.country) {
          analytics.byCountry[addr.country] = (analytics.byCountry[addr.country] || 0) + 1;
        }
        if (addr.state) {
          analytics.byState[addr.state] = (analytics.byState[addr.state] || 0) + 1;
        }
        if (addr.city) {
          analytics.byCity[addr.city] = (analytics.byCity[addr.city] || 0) + 1;
        }
      });

      return analytics;
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
