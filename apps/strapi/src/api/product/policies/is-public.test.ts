/**
 * Product is-public Policy tests
 *
 * Tests for the product public policy to ensure proper public access control
 */

import { describe, expect, it } from '@jest/globals';
import isPublicPolicy from './is-public';

describe('Product is-public Policy', () => {
  describe('Public Access', () => {
    it('should allow access for authenticated users', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'authenticated' },
          },
        },
        query: {} as any,
      };

      const result = await isPublicPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
      expect(policyContext.query.filters).toBeUndefined();
    });

    it('should allow access for admin users', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'admin' },
          },
        },
        query: {} as any,
      };

      const result = await isPublicPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
      expect(policyContext.query.filters).toBeUndefined();
    });

    it('should allow access for unauthenticated users with active filter', async () => {
      const policyContext = {
        state: { user: null },
        query: {} as any,
      };

      const result = await isPublicPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
      expect(policyContext.query.filters).toEqual({
        status: 'active',
      });
    });

    it('should preserve existing filters for unauthenticated users', async () => {
      const policyContext = {
        state: { user: null },
        query: {
          filters: {
            category: 'electronics',
          },
        } as any,
      };

      const result = await isPublicPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
      expect(policyContext.query.filters).toEqual({
        category: 'electronics',
        status: 'active',
      });
    });

    it('should handle missing query object', async () => {
      const policyContext = {
        state: { user: null },
      };

      const result = await isPublicPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(true);
    });
  });
});
