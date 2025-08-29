/**
 * SEO service tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import seoService from './seo';

describe('SEO Service', () => {
  const mockProduct = {
    id: 1,
    title: 'Test Product',
    description:
      'This is a test product description that is long enough to be meaningful.',
    shortDescription: 'Test product short description',
    price: 29.99,
    comparePrice: 39.99,
    sku: 'TEST-001',
    inventory: 10,
    slug: 'test-product',
    images: [
      { url: 'https://example.com/image1.jpg' },
      { url: 'https://example.com/image2.jpg' },
    ],
    category: {
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
    },
  };

  describe('generateSEOData', () => {
    it('should generate complete SEO data from product', async () => {
      const result = await seoService.generateSEOData(mockProduct);

      expect(result.metaTitle).toBe('Test Product - Electronics');
      expect(result.metaDescription).toBe('Test product short description');
      expect(result.keywords).toContain('test');
      expect(result.keywords).toContain('product');
      expect(result.keywords).toContain('electronics');
      expect(result.canonicalURL).toBe('/products/test-product');
      expect(result.metaRobots).toBe('index,follow');
      expect(result.ogType).toBe('product');
      expect(result.twitterCard).toBe('summary_large_image');
      expect(result.metaImage).toEqual(mockProduct.images[0]);
    });

    it('should use custom SEO data when provided', async () => {
      const customSEO = {
        metaTitle: 'Custom Title',
        metaDescription: 'Custom description',
        keywords: 'custom, keywords',
      };

      const result = await seoService.generateSEOData(mockProduct, customSEO);

      expect(result.metaTitle).toBe('Custom Title');
      expect(result.metaDescription).toBe('Custom description');
      expect(result.keywords).toBe('custom, keywords');
    });

    it('should handle product without category', async () => {
      const productWithoutCategory = { ...mockProduct, category: undefined };
      const result = await seoService.generateSEOData(productWithoutCategory);

      expect(result.metaTitle).toBe('Test Product');
      expect(result.keywords).not.toContain('electronics');
    });

    it('should handle product without images', async () => {
      const productWithoutImages = { ...mockProduct, images: undefined };
      const result = await seoService.generateSEOData(productWithoutImages);

      expect(result.metaImage).toBeUndefined();
    });
  });

  describe('generateMetaTitle', () => {
    it('should generate meta title with category', () => {
      const result = seoService.generateMetaTitle(mockProduct);
      expect(result).toBe('Test Product - Electronics');
    });

    it('should truncate long titles', () => {
      const longTitleProduct = {
        ...mockProduct,
        title:
          'This is a very long product title that exceeds the maximum allowed length for meta titles',
        category: { name: 'Very Long Category Name' },
      };

      const result = seoService.generateMetaTitle(longTitleProduct);
      expect(result.length).toBeLessThanOrEqual(60);
      expect(result).toContain('...');
    });

    it('should handle product without category', () => {
      const productWithoutCategory = { ...mockProduct, category: undefined };
      const result = seoService.generateMetaTitle(productWithoutCategory);
      expect(result).toBe('Test Product');
    });
  });

  describe('generateMetaDescription', () => {
    it('should use short description when available', () => {
      const result = seoService.generateMetaDescription(mockProduct);
      expect(result).toBe('Test product short description');
    });

    it('should fall back to full description', () => {
      const productWithoutShortDesc = {
        ...mockProduct,
        shortDescription: undefined,
      };
      const result = seoService.generateMetaDescription(
        productWithoutShortDesc
      );
      expect(result).toContain('This is a test product description');
    });

    it('should strip HTML tags', () => {
      const productWithHTML = {
        ...mockProduct,
        shortDescription:
          '<p>Test description with <strong>HTML</strong> tags</p>',
      };

      const result = seoService.generateMetaDescription(productWithHTML);
      expect(result).toBe('Test description with HTML tags');
    });

    it('should truncate long descriptions', () => {
      const longDescProduct = {
        ...mockProduct,
        shortDescription: 'A'.repeat(200),
      };

      const result = seoService.generateMetaDescription(longDescProduct);
      expect(result.length).toBeLessThanOrEqual(160);
      expect(result).toContain('...');
    });
  });

  describe('generateKeywords', () => {
    it('should generate keywords from title and category', () => {
      const result = seoService.generateKeywords(mockProduct);

      expect(result).toContain('test');
      expect(result).toContain('product');
      expect(result).toContain('electronics');
      expect(result).toContain('test-001');
    });

    it('should filter out short words', () => {
      const shortWordProduct = {
        ...mockProduct,
        title: 'A B C Test Product',
      };

      const result = seoService.generateKeywords(shortWordProduct);
      expect(result).not.toContain(' a');
      expect(result).not.toContain(' b');
      expect(result).not.toContain(' c');
      expect(result).toContain('test');
      expect(result).toContain('product');
    });

    it('should limit to 10 keywords', () => {
      const manyWordProduct = {
        ...mockProduct,
        title: 'One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve',
      };

      const result = seoService.generateKeywords(manyWordProduct);
      const keywordCount = result.split(',').length;
      expect(keywordCount).toBeLessThanOrEqual(10);
    });
  });

  describe('generateStructuredData', () => {
    it('should generate valid JSON-LD structured data', () => {
      const result = seoService.generateStructuredData(mockProduct);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Product');
      expect(result.name).toBe('Test Product');
      expect(result.description).toBe('Test product short description');
      expect(result.sku).toBe('TEST-001');
      expect(result.offers.price).toBe(29.99);
      expect(result.offers.priceCurrency).toBe('USD');
      expect(result.offers.availability).toBe('https://schema.org/InStock');
    });

    it('should include compare price when available', () => {
      const result = seoService.generateStructuredData(mockProduct);

      expect(result.offers.highPrice).toBe(39.99);
      expect(result.offers.lowPrice).toBe(29.99);
    });

    it('should include category when available', () => {
      const result = seoService.generateStructuredData(mockProduct);
      expect(result.category).toBe('Electronics');
    });

    it('should include images when available', () => {
      const result = seoService.generateStructuredData(mockProduct);
      expect(result.image).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ]);
    });

    it('should show out of stock when inventory is 0', () => {
      const outOfStockProduct = { ...mockProduct, inventory: 0 };
      const result = seoService.generateStructuredData(outOfStockProduct);
      expect(result.offers.availability).toBe('https://schema.org/OutOfStock');
    });
  });

  describe('validateSEOData', () => {
    it('should pass validation for valid SEO data', async () => {
      const validSEOData = {
        metaTitle: 'Valid Meta Title',
        metaDescription:
          'This is a valid meta description that is long enough to be meaningful.',
        keywords: 'keyword1, keyword2, keyword3',
        canonicalURL: 'https://example.com/product',
        metaRobots: 'index,follow',
        ogType: 'product',
        twitterCard: 'summary_large_image',
      };

      const result = await seoService.validateSEOData(validSEOData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for meta title too short', async () => {
      const invalidSEOData = {
        metaTitle: 'Short',
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta title should be at least 10 characters'
      );
    });

    it('should fail validation for meta title too long', async () => {
      const invalidSEOData = {
        metaTitle: 'A'.repeat(61),
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta title should be 60 characters or less'
      );
    });

    it('should fail validation for meta description too short', async () => {
      const invalidSEOData = {
        metaDescription: 'Short',
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta description should be at least 50 characters'
      );
    });

    it('should fail validation for invalid canonical URL', async () => {
      const invalidSEOData = {
        canonicalURL: 'not-a-valid-url',
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Canonical URL must be a valid URL');
    });

    it('should fail validation for invalid meta robots', async () => {
      const invalidSEOData = {
        metaRobots: 'invalid-robots',
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid meta robots value');
    });

    it('should fail validation for invalid OG type', async () => {
      const invalidSEOData = {
        ogType: 'invalid-type',
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Open Graph type');
    });

    it('should fail validation for invalid Twitter card', async () => {
      const invalidSEOData = {
        twitterCard: 'invalid-card',
      };

      const result = await seoService.validateSEOData(invalidSEOData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Twitter card type');
    });
  });

  describe('optimizeSEOData', () => {
    it('should add brand name to meta title if space allows', async () => {
      const seoData = {
        metaTitle: 'Test Product',
      };

      const result = await seoService.optimizeSEOData(seoData, mockProduct);

      expect(result.metaTitle).toBe('Test Product - Store Brand');
    });

    it('should add call to action to meta description if space allows', async () => {
      const seoData = {
        metaDescription:
          'This is a test product description that is long enough.',
      };

      const result = await seoService.optimizeSEOData(seoData, mockProduct);

      expect(result.metaDescription).toContain('Buy now!');
    });

    it('should add price to meta description if space allows', async () => {
      const seoData = {
        metaDescription: 'This is a test product description.',
      };

      const result = await seoService.optimizeSEOData(seoData, mockProduct);

      expect(result.metaDescription).toContain('$29.99');
    });

    it('should not modify if no space available', async () => {
      const seoData = {
        metaTitle: 'A'.repeat(60),
        metaDescription: 'A'.repeat(160),
      };

      const result = await seoService.optimizeSEOData(seoData, mockProduct);

      expect(result.metaTitle).toBe(seoData.metaTitle);
      expect(result.metaDescription).toBe(seoData.metaDescription);
    });
  });

  describe('generateSitemapData', () => {
    it('should generate sitemap data for products', async () => {
      const products = [
        { ...mockProduct, featured: true, updatedAt: '2024-01-01T00:00:00Z' },
        {
          ...mockProduct,
          id: 2,
          featured: false,
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      const result = await seoService.generateSitemapData(products);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        url: '/products/test-product',
        lastmod: '2024-01-01T00:00:00Z',
        changefreq: 'weekly',
        priority: 0.8,
      });
      expect(result[1]).toEqual({
        url: '/products/test-product',
        lastmod: '2024-01-02T00:00:00Z',
        changefreq: 'weekly',
        priority: 0.6,
      });
    });
  });

  describe('generateRobotsTxt', () => {
    it('should generate robots.txt content', () => {
      const baseUrl = 'https://example.com';
      const result = seoService.generateRobotsTxt(baseUrl);

      expect(result).toContain('User-agent: *');
      expect(result).toContain('Allow: /');
      expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
      expect(result).toContain('Disallow: /admin/');
      expect(result).toContain('Allow: /products/');
      expect(result).toContain('Allow: /categories/');
    });
  });
});
