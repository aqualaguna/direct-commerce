/**
 * Product is-admin Policy tests
 *
 * Tests for the product admin policy to ensure proper access control
 */

import { describe, expect, it } from '@jest/globals';
import isAdminPolicy from './is-admin';

describe('Product is-admin Policy', () => {
  describe('Admin Access', () => {
    it('should allow access for admin users', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
            role: { type: 'admin' },
          },
        },
      };

      const result = await isAdminPolicy(policyContext, {}, { strapi: {} });

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
      };

      const result = await isAdminPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(false);
    });

    it('should deny access for users without role', async () => {
      const policyContext = {
        state: {
          user: {
            id: 1,
          },
        },
      };

      const result = await isAdminPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(false);
    });

    it('should deny access for unauthenticated users', async () => {
      const policyContext = {
        state: { user: null },
      };

      const result = await isAdminPolicy(policyContext, {}, { strapi: {} });

      expect(result).toBe(false);
    });
  });
});
