/**
 * Product can-manage-wishlist Policy tests
 *
 * Tests for the product wishlist management policy
 */

import { describe, expect, it } from '@jest/globals';
import canManageWishlistPolicy from './can-manage-wishlist';

describe('Product can-manage-wishlist Policy', () => {
  describe('Wishlist Management', () => {
    it('should allow access for authenticated users', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'authenticated' },
          },
        },
        params: { id: 'product-123' },
      };

      const result = await canManageWishlistPolicy(
        policyContext,
        {},
        { strapi: {} }
      );

      expect(result).toBe(true);
    });

    it('should allow access for admin users', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'admin' },
          },
        },
        params: { id: 'product-123' },
      };

      const result = await canManageWishlistPolicy(
        policyContext,
        {},
        { strapi: {} }
      );

      expect(result).toBe(true);
    });

    it('should deny access for unauthenticated users', async () => {
      const policyContext = {
        state: { user: null },
        params: { id: 'product-123' },
      };

      const result = await canManageWishlistPolicy(
        policyContext,
        {},
        { strapi: {} }
      );

      expect(result).toBe(false);
    });

    it('should handle missing product ID', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'authenticated' },
          },
        },
        params: {},
      };

      const result = await canManageWishlistPolicy(
        policyContext,
        {},
        { strapi: {} }
      );

      expect(result).toBe(true);
    });

    it('should handle users without role', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
          },
        },
        params: { id: 'product-123' },
      };

      const result = await canManageWishlistPolicy(
        policyContext,
        {},
        { strapi: {} }
      );

      expect(result).toBe(true);
    });
  });
});
