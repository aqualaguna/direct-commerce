/**
 * Product is-owner Policy tests
 *
 * Tests for the product ownership policy to ensure proper access control
 */

import { describe, expect, it } from '@jest/globals';
import isOwnerPolicy from './is-owner';

describe('Product is-owner Policy', () => {
  describe('Owner Access', () => {
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

      const result = await isOwnerPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
    });

    it('should deny access for non-admin users', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'authenticated' },
          },
        },
        params: { id: 'product-123' },
      };

      const result = await isOwnerPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(false);
    });

    it('should deny access for users without role', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
          },
        },
        params: { id: 'product-123' },
      };

      const result = await isOwnerPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(false);
    });

    it('should deny access for unauthenticated users', async () => {
      const policyContext = {
        state: { user: null },
        params: { id: 'product-123' },
      };

      const result = await isOwnerPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(false);
    });

    it('should handle missing product ID', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'admin' },
          },
        },
        params: {},
      };

      const result = await isOwnerPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
    });
  });
});
