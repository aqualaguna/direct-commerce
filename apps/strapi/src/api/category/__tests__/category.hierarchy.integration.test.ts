import request from 'supertest';

describe('Category Hierarchy Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;

  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testCategory = {
    name: `Test Category ${timestamp}`,
    description: 'This is a test category for integration testing',
    slug: `test-category-${timestamp}`
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  afterAll(async () => {
    // Global cleanup - delete all test categories that might have been left behind
    try {
      const response = await request(SERVER_URL)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      if (response.status === 200 && response.body.data) {
        const categories = response.body.data;
        for (const category of categories) {
          // Only delete categories that match our test pattern
          if (category.name && category.name.includes('Parent Category') ||
            category.name && category.name.includes('Child Category') ||
            category.name && category.name.includes('Tree Parent Category') ||
            category.name && category.name.includes('Tree Child Category')) {
            try {
              await request(SERVER_URL)
                .delete(`/api/categories/${category.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .timeout(10000);
            } catch (error) {
              console.warn(`Failed to delete category ${category.documentId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to perform global cleanup:', error);
    }
  });

  describe('Category Hierarchy', () => {
    let parentCategoryId: string;
    let childCategoryId: string;

    beforeAll(async () => {
      // Create parent category
      const parentResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Parent Category ${timestamp}`, slug: `parent-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(parentResponse.status);
      parentCategoryId = parentResponse.body.data.documentId;
    });

    afterAll(async () => {
      // Clean up categories
      if (childCategoryId) {
        await request(SERVER_URL)
          .delete(`/api/categories/${childCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      }
      if (parentCategoryId) {
        await request(SERVER_URL)
          .delete(`/api/categories/${parentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      }
    });

    it('should create a child category', async () => {
      const childCategory = {
        ...testCategory,
        name: `Child Category ${timestamp}`,
        slug: `child-category-${timestamp}`,
        parent: parentCategoryId
      };

      const response = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: childCategory })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.parent).toBeDefined();
      expect(response.body.data.parent.documentId).toBe(parentCategoryId);

      childCategoryId = response.body.data.documentId;
    });

    it('should retrieve category with parent relationship', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/categories/${childCategoryId}?populate=parent`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.parent).toBeDefined();
      expect(response.body.data.parent.documentId).toBe(parentCategoryId);
    });
  });

  describe('Category Tree and Navigation', () => {
    let treeParentCategoryId: string;
    let treeChildCategoryId: string;

    beforeAll(async () => {
      // Create parent category
      const parentResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Tree Parent Category ${timestamp}`, slug: `tree-parent-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(parentResponse.status);
      treeParentCategoryId = parentResponse.body.data.documentId;

      // Create child category
      const childResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Tree Child Category ${timestamp}`, slug: `tree-child-category-${timestamp}`, parent: treeParentCategoryId } })
        .timeout(10000);

      expect([200, 201]).toContain(childResponse.status);
      treeChildCategoryId = childResponse.body.data.documentId;
    });

    afterAll(async () => {
      // Clean up categories
      if (treeChildCategoryId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${treeChildCategoryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete child category ${treeChildCategoryId}:`, error);
        }
      }
      if (treeParentCategoryId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${treeParentCategoryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete parent category ${treeParentCategoryId}:`, error);
        }
      }
    });

    it('should get category tree structure', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories/tree')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get category breadcrumbs', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/categories/${treeChildCategoryId}/breadcrumbs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get navigation menu', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories/navigation')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get sibling categories', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/categories/${treeChildCategoryId}/siblings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get category statistics', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/categories/${treeParentCategoryId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

        expect([200, 201]).toContain(response.status);
    });
  });
});
