/**
 * Test Data Factories for Product Listing Integration Tests
 * 
 * Provides factory functions to create test data for product listing and related entities
 * following the established testing patterns and data models.
 */

import request from 'supertest';

export interface TestProductData {
  name: string;
  sku: string;
  basePrice: number;
  comparePrice?: number;
  inventory: number;
  isActive: boolean;
  status: 'draft' | 'published';
}

export interface TestCategoryData {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  status: 'draft' | 'published';
}

export interface TestProductListingData {
  title: string;
  description: string;
  shortDescription?: string;
  type: 'single' | 'variant';
  basePrice?: number;
  comparePrice?: number;
  isActive: boolean;
  featured: boolean;
  product: string;
  category?: string;
  images?: any[];
  status: 'draft' | 'published';
}

export interface TestOptionGroupData {
  name: string;
  displayName: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  isActive: boolean;
  status: 'draft' | 'published';
}

export interface TestOptionValueData {
  name: string;
  displayName: string;
  value: string;
  optionGroup: string;
  isActive: boolean;
  status: 'draft' | 'published';
}

export interface TestProductListingVariantData {
  sku: string;
  price: number;
  comparePrice?: number;
  inventory: number;
  isActive: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  productListing: string;
  optionValues?: string[];
  images?: any[];
  status: 'draft' | 'published';
}

export class TestDataFactories {
  private serverUrl: string;
  private adminToken: string;
  private timestamp: number;

  constructor(serverUrl: string = 'http://localhost:1337', adminToken?: string) {
    this.serverUrl = serverUrl;
    this.adminToken = adminToken || process.env.STRAPI_API_TOKEN as string;
    this.timestamp = Date.now();

    if (!this.adminToken) {
      throw new Error('Admin token is required for test data factories');
    }
  }

  /**
   * Create a test product
   */
  async createProduct(overrides: Partial<TestProductData> = {}): Promise<any> {
    const productData: TestProductData = {
      name: `Test Product ${this.timestamp}`,
      sku: `TEST-PROD-${this.timestamp}`,
      basePrice: 29.99,
      comparePrice: 39.99,
      inventory: 100,
      isActive: true,
      status: 'published',
      ...overrides
    };

    const response = await request(this.serverUrl)
      .post('/api/products')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ data: productData })
      .timeout(10000);

    if (response.status !== 201) {
      throw new Error(`Failed to create test product: ${response.status} ${response.text}`);
    }

    return response.body;
  }

  /**
   * Create a test category
   */
  async createCategory(overrides: Partial<TestCategoryData> = {}): Promise<any> {
    const categoryData: TestCategoryData = {
      name: `Test Category ${this.timestamp}`,
      slug: `test-category-${this.timestamp}`,
      description: 'Test category for integration tests',
      isActive: true,
      status: 'published',
      ...overrides
    };

    const response = await request(this.serverUrl)
      .post('/api/categories')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ data: categoryData })
      .timeout(10000);

    if (response.status !== 201) {
      throw new Error(`Failed to create test category: ${response.status} ${response.text}`);
    }

    return response.body;
  }

  /**
   * Create a test product listing
   */
  async createProductListing(overrides: Partial<TestProductListingData> = {}): Promise<any> {
    // Ensure required dependencies exist
    if (!overrides.product) {
      const product = await this.createProduct();
      overrides.product = product.documentId;
    }

    const productListingData: TestProductListingData = {
      title: `Test Product Listing ${this.timestamp}`,
      description: 'Test product listing description for integration testing',
      shortDescription: 'Short description for testing',
      type: 'single',
      basePrice: 29.99,
      comparePrice: 39.99,
      isActive: true,
      featured: false,
      product: overrides.product,
      images: [],
      status: 'published',
      ...overrides
    };

    const response = await request(this.serverUrl)
      .post('/api/product-listings')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ data: productListingData })
      .timeout(10000);

    if (response.status !== 201) {
      throw new Error(`Failed to create test product listing: ${response.status} ${response.text}`);
    }

    return response.body;
  }

  /**
   * Create a test option group
   */
  async createOptionGroup(overrides: Partial<TestOptionGroupData> = {}): Promise<any> {
    const optionGroupData: TestOptionGroupData = {
      name: `Test Option Group ${this.timestamp}`,
      displayName: 'Size',
      type: 'single',
      isRequired: true,
      isActive: true,
      status: 'published',
      ...overrides
    };

    const response = await request(this.serverUrl)
      .post('/api/option-groups')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ data: optionGroupData })
      .timeout(10000);

    if (response.status !== 201) {
      throw new Error(`Failed to create test option group: ${response.status} ${response.text}`);
    }

    return response.body;
  }

  /**
   * Create a test option value
   */
  async createOptionValue(overrides: Partial<TestOptionValueData> = {}): Promise<any> {
    // Ensure required dependencies exist
    if (!overrides.optionGroup) {
      const optionGroup = await this.createOptionGroup();
      overrides.optionGroup = optionGroup.documentId;
    }

    const optionValueData: TestOptionValueData = {
      name: `Test Option Value ${this.timestamp}`,
      displayName: 'Large',
      value: 'large',
      optionGroup: overrides.optionGroup,
      isActive: true,
      status: 'published',
      ...overrides
    };

    const response = await request(this.serverUrl)
      .post('/api/option-values')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ data: optionValueData })
      .timeout(10000);

    if (response.status !== 201) {
      throw new Error(`Failed to create test option value: ${response.status} ${response.text}`);
    }

    return response.body;
  }

  /**
   * Create a test product listing variant
   */
  async createProductListingVariant(overrides: Partial<TestProductListingVariantData> = {}): Promise<any> {
    // Ensure required dependencies exist
    if (!overrides.productListing) {
      const productListing = await this.createProductListing();
      overrides.productListing = productListing.documentId;
    }

    const variantData: TestProductListingVariantData = {
      sku: `TEST-VARIANT-${this.timestamp}`,
      price: 34.99,
      comparePrice: 44.99,
      inventory: 50,
      isActive: true,
      weight: 1.5,
      length: 10.0,
      width: 8.0,
      height: 2.0,
      productListing: overrides.productListing,
      optionValues: [],
      images: [],
      status: 'published',
      ...overrides
    };

    const response = await request(this.serverUrl)
      .post('/api/product-listing-variants')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ data: variantData })
      .timeout(10000);

    if (response.status !== 201) {
      throw new Error(`Failed to create test product listing variant: ${response.status} ${response.text}`);
    }

    return response.body;
  }

  /**
   * Create multiple test product listings for bulk testing
   */
  async createMultipleProductListings(count: number, overrides: Partial<TestProductListingData> = {}): Promise<any[]> {
    const productListings = [];
    
    for (let i = 0; i < count; i++) {
      const listingOverrides = {
        ...overrides,
        title: `${overrides.title || `Bulk Test Listing ${i + 1}`} ${this.timestamp}`,
        type: (i % 2 === 0 ? 'single' : 'variant') as 'single' | 'variant',
        basePrice: 19.99 + (i * 10),
        featured: i % 3 === 0
      };

      const productListing = await this.createProductListing(listingOverrides);
      productListings.push(productListing);
    }

    return productListings;
  }

  /**
   * Create multiple test variants for bulk testing
   */
  async createMultipleVariants(count: number, overrides: Partial<TestProductListingVariantData> = {}): Promise<any[]> {
    const variants = [];
    
    for (let i = 0; i < count; i++) {
      const variantOverrides = {
        ...overrides,
        sku: `${overrides.sku || `BULK-VARIANT-${i + 1}`}-${this.timestamp}`,
        price: 19.99 + (i * 5),
        inventory: 10 + (i * 5),
        isActive: i % 2 === 0
      };

      const variant = await this.createProductListingVariant(variantOverrides);
      variants.push(variant);
    }

    return variants;
  }

  /**
   * Create a complete product listing with variants for comprehensive testing
   */
  async createProductListingWithVariants(variantCount: number = 3): Promise<{
    product: any;
    category: any;
    productListing: any;
    optionGroup: any;
    optionValues: any[];
    variants: any[];
  }> {
    // Create base entities
    const product = await this.createProduct();
    const category = await this.createCategory();
    const optionGroup = await this.createOptionGroup();

    // Create option values
    const optionValues = [];
    const optionValueNames = ['Small', 'Medium', 'Large', 'X-Large'];
    
    for (let i = 0; i < Math.min(variantCount, optionValueNames.length); i++) {
      const optionValue = await this.createOptionValue({
        optionGroup: optionGroup.documentId,
        name: `Test Option Value ${i + 1} ${this.timestamp}`,
        displayName: optionValueNames[i],
        value: optionValueNames[i].toLowerCase().replace('-', '_')
      });
      optionValues.push(optionValue);
    }

    // Create product listing
    const productListing = await this.createProductListing({
      product: product.documentId,
      category: category.documentId,
      type: 'variant',
      basePrice: 29.99
    });

    // Create variants
    const variants = [];
    for (let i = 0; i < variantCount; i++) {
      const variant = await this.createProductListingVariant({
        productListing: productListing.documentId,
        sku: `COMPLETE-VARIANT-${i + 1}-${this.timestamp}`,
        price: 29.99 + (i * 10),
        inventory: 20 + (i * 5),
        optionValues: [optionValues[i % optionValues.length].documentId]
      });
      variants.push(variant);
    }

    return {
      product,
      category,
      productListing,
      optionGroup,
      optionValues,
      variants
    };
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(entities: any[]): Promise<void> {
    const cleanupOrder = [
      'product-listing-variants',
      'product-listings',
      'option-values',
      'option-groups',
      'products',
      'categories'
    ];

    for (const entityType of cleanupOrder) {
      for (const entity of entities) {
        if (entity && entity.documentId) {
          try {
            await request(this.serverUrl)
              .delete(`/api/${entityType}/${entity.documentId}`)
              .set('Authorization', `Bearer ${this.adminToken}`)
              .timeout(10000);
          } catch (error) {
            console.warn(`Failed to clean up ${entityType}:`, error.message);
          }
        }
      }
    }
  }

  /**
   * Clean up a single entity
   */
  async cleanupEntity(entity: any, entityType: string): Promise<void> {
    if (entity && entity.documentId) {
      try {
        await request(this.serverUrl)
          .delete(`/api/${entityType}/${entity.documentId}`)
          .set('Authorization', `Bearer ${this.adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to clean up ${entityType}:`, error.message);
      }
    }
  }

  /**
   * Generate unique timestamp for test data
   */
  generateTimestamp(): number {
    return Date.now();
  }

  /**
   * Generate unique SKU for test data
   */
  generateUniqueSku(prefix: string = 'TEST'): string {
    return `${prefix}-${this.timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique name for test data
   */
  generateUniqueName(prefix: string = 'Test'): string {
    return `${prefix} ${this.timestamp} ${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance for convenience
export const testFactories = new TestDataFactories();

// Export individual factory functions for convenience
export const createTestProduct = (overrides?: Partial<TestProductData>) => 
  testFactories.createProduct(overrides);

export const createTestCategory = (overrides?: Partial<TestCategoryData>) => 
  testFactories.createCategory(overrides);

export const createTestProductListing = (overrides?: Partial<TestProductListingData>) => 
  testFactories.createProductListing(overrides);

export const createTestOptionGroup = (overrides?: Partial<TestOptionGroupData>) => 
  testFactories.createOptionGroup(overrides);

export const createTestOptionValue = (overrides?: Partial<TestOptionValueData>) => 
  testFactories.createOptionValue(overrides);

export const createTestProductListingVariant = (overrides?: Partial<TestProductListingVariantData>) => 
  testFactories.createProductListingVariant(overrides);

export const createTestProductListingWithVariants = (variantCount?: number) => 
  testFactories.createProductListingWithVariants(variantCount);

export const cleanupTestData = (entities: any[]) => 
  testFactories.cleanupTestData(entities);

export const cleanupEntity = (entity: any, entityType: string) => 
  testFactories.cleanupEntity(entity, entityType);
