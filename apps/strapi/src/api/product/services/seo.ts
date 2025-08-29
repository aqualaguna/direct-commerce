import { URL } from 'url';

/**
 * SEO service for product metadata management
 */

interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: any;
  keywords?: string;
  canonicalURL?: string;
  metaRobots?: string;
  structuredData?: any;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

interface ProductData {
  id: number;
  title: string;
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  sku: string;
  inventory: number;
  images?: any[];
  category?: any;
  slug: string;
  updatedAt?: string;
  featured?: boolean;
}
const stopWords = [
  'a',
  'an',
  'the',
  'and',
  'or',
  'in',
  'on',
  'of',
  'for',
  'with',
];
export default {
  /**
   * Generate SEO metadata for a product
   */
  async generateSEOData(
    product: ProductData,
    customSEO?: SEOData
  ): Promise<SEOData> {
    const seoData: SEOData = {
      metaTitle: customSEO?.metaTitle || this.generateMetaTitle(product),
      metaDescription:
        customSEO?.metaDescription || this.generateMetaDescription(product),
      keywords: customSEO?.keywords || this.generateKeywords(product),
      canonicalURL:
        customSEO?.canonicalURL || this.generateCanonicalURL(product),
      metaRobots: customSEO?.metaRobots || 'index,follow',
      structuredData:
        customSEO?.structuredData || this.generateStructuredData(product),
      ogTitle: customSEO?.ogTitle || this.generateOGTitle(product),
      ogDescription:
        customSEO?.ogDescription || this.generateOGDescription(product),
      ogType: customSEO?.ogType || 'product',
      twitterCard: customSEO?.twitterCard || 'summary_large_image',
      twitterTitle:
        customSEO?.twitterTitle || this.generateTwitterTitle(product),
      twitterDescription:
        customSEO?.twitterDescription ||
        this.generateTwitterDescription(product),
    };

    // Use product images for meta image if not provided
    if (!customSEO?.metaImage && product.images && product.images.length > 0) {
      [seoData.metaImage] = product.images;
    } else if (customSEO?.metaImage) {
      seoData.metaImage = customSEO.metaImage;
    }

    return seoData;
  },

  /**
   * Generate meta title from product data
   */
  generateMetaTitle(product: ProductData): string {
    const baseTitle = product.title;
    const categoryName = product.category?.name || '';

    let metaTitle = baseTitle;

    if (categoryName) {
      metaTitle = `${baseTitle} - ${categoryName}`;
    }

    // Ensure it doesn't exceed 60 characters
    if (metaTitle.length > 60) {
      metaTitle = `${metaTitle.substring(0, 57)}...`;
    }

    return metaTitle;
  },

  /**
   * Generate meta description from product data
   */
  generateMetaDescription(product: ProductData): string {
    let description = product.shortDescription || product.description;

    // Strip HTML tags if present
    description = description.replace(/<[^>]*>/g, '');

    // Ensure it doesn't exceed 160 characters
    if (description.length > 160) {
      description = `${description.substring(0, 157)}...`;
    }

    return description;
  },

  /**
   * Generate keywords from product data
   */
  generateKeywords(product: ProductData): string {
    const keywords = [];

    // Add product title words
    const titleWords = product.title
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
    keywords.push(...titleWords);

    // Add category name
    if (product.category?.name) {
      keywords.push(product.category.name.toLowerCase());
    }

    // Add SKU
    keywords.push(product.sku.toLowerCase());

    // Remove duplicates and join
    return [...new Set(keywords)].slice(0, 10).join(', ');
  },

  /**
   * Generate canonical URL
   */
  generateCanonicalURL(product: ProductData): string {
    return `/products/${product.slug}`;
  },

  /**
   * Generate Open Graph title
   */
  generateOGTitle(product: ProductData): string {
    return this.generateMetaTitle(product);
  },

  /**
   * Generate Open Graph description
   */
  generateOGDescription(product: ProductData): string {
    return this.generateMetaDescription(product);
  },

  /**
   * Generate Twitter title
   */
  generateTwitterTitle(product: ProductData): string {
    return this.generateMetaTitle(product);
  },

  /**
   * Generate Twitter description
   */
  generateTwitterDescription(product: ProductData): string {
    return this.generateMetaDescription(product);
  },

  /**
   * Generate structured data (JSON-LD) for product
   */
  generateStructuredData(product: ProductData): any {
    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.shortDescription || product.description,
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: 'Store Brand', // This could be configurable
      },
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'USD', // This could be configurable
        availability:
          product.inventory > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: this.generateCanonicalURL(product),
      },
    };

    // Add compare price if available
    if (product.comparePrice) {
      structuredData.offers.highPrice = product.comparePrice;
      structuredData.offers.lowPrice = product.price;
    }

    // Add category if available
    if (product.category) {
      structuredData.category = product.category.name;
    }

    // Add images if available
    if (product.images && product.images.length > 0) {
      structuredData.image = product.images.map((img: any) => img.url);
    }

    return structuredData;
  },

  /**
   * Validate SEO data
   */
  async validateSEOData(
    seoData: SEOData
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate meta title
    if (seoData.metaTitle) {
      if (seoData.metaTitle.length > 60) {
        errors.push('Meta title should be 60 characters or less');
      }
      if (seoData.metaTitle.length < 10) {
        errors.push('Meta title should be at least 10 characters');
      }
    }

    // Validate meta description
    if (seoData.metaDescription) {
      if (seoData.metaDescription.length > 160) {
        errors.push('Meta description should be 160 characters or less');
      }
      if (seoData.metaDescription.length < 50) {
        errors.push('Meta description should be at least 50 characters');
      }
    }

    // Validate keywords
    if (seoData.keywords) {
      const keywords = seoData.keywords.split(',').map(k => k.trim());
      if (keywords.length > 10) {
        errors.push('Keywords should not exceed 10 items');
      }

      for (const keyword of keywords) {
        if (keyword.length > 50) {
          errors.push('Individual keywords should not exceed 50 characters');
        }
      }
    }

    // Validate canonical URL
    if (seoData.canonicalURL) {
      try {
        new URL(seoData.canonicalURL);
      } catch {
        errors.push('Canonical URL must be a valid URL');
      }
    }

    // Validate meta robots
    const validRobots = [
      'index,follow',
      'noindex,follow',
      'index,nofollow',
      'noindex,nofollow',
    ];
    if (seoData.metaRobots && !validRobots.includes(seoData.metaRobots)) {
      errors.push('Invalid meta robots value');
    }

    // Validate OG type
    const validOGTypes = ['website', 'article', 'product'];
    if (seoData.ogType && !validOGTypes.includes(seoData.ogType)) {
      errors.push('Invalid Open Graph type');
    }

    // Validate Twitter card
    const validTwitterCards = [
      'summary',
      'summary_large_image',
      'app',
      'player',
    ];
    if (
      seoData.twitterCard &&
      !validTwitterCards.includes(seoData.twitterCard)
    ) {
      errors.push('Invalid Twitter card type');
    }

    // Validate structured data
    if (seoData.structuredData) {
      try {
        JSON.parse(JSON.stringify(seoData.structuredData));
      } catch {
        errors.push('Structured data must be valid JSON');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Optimize SEO data for search engines
   */
  async optimizeSEOData(
    seoData: SEOData,
    product: ProductData
  ): Promise<SEOData> {
    const optimized = { ...seoData };

    // Ensure meta title includes brand name if not present
    if (optimized.metaTitle && !optimized.metaTitle.includes('Store Brand')) {
      const brandSuffix = ' - Store Brand';
      if (optimized.metaTitle.length + brandSuffix.length <= 60) {
        optimized.metaTitle += brandSuffix;
      }
    }

    // Ensure meta description includes call to action
    if (
      optimized.metaDescription &&
      !optimized.metaDescription.includes('Buy') &&
      !optimized.metaDescription.includes('Shop')
    ) {
      const ctaSuffix = ' - Buy now!';
      if (optimized.metaDescription.length + ctaSuffix.length <= 160) {
        optimized.metaDescription += ctaSuffix;
      }
    }

    // Add price to meta description if space allows
    if (optimized.metaDescription && product.price) {
      const priceSuffix = ` - $${product.price}`;
      if (optimized.metaDescription.length + priceSuffix.length <= 160) {
        optimized.metaDescription += priceSuffix;
      }
    }

    return optimized;
  },

  /**
   * Generate sitemap data for products
   */
  async generateSitemapData(products: ProductData[]): Promise<any[]> {
    return products.map(product => ({
      url: this.generateCanonicalURL(product),
      lastmod: product.updatedAt || new Date().toISOString(),
      changefreq: 'weekly',
      priority: product.featured ? 0.8 : 0.6,
    }));
  },

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(baseUrl: string): string {
    return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/admin/
Disallow: /_admin/

# Allow product pages
Allow: /products/
Allow: /categories/`;
  },
};
