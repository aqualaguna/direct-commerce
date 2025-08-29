/**
 * Product validation service
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface BusinessRule {
  name?: string;
  validate: (data: any) => Promise<ValidationResult>;
}

export default {
  /**
   * Validate product business rules
   */
  async validateBusinessRules(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    // Apply all business rules
    const rules: BusinessRule[] = [
      { validate: this.priceRule },
      { validate: this.inventoryRule },
      { validate: this.skuRule },
      { validate: this.categoryRule },
      { validate: this.pricingRule },
    ];

    for (const rule of rules) {
      const result = await rule.validate(data);
      if (!result.isValid) {
        errors.push(...result.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Price business rule: Price must be positive and reasonable
   */
  async priceRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.price !== undefined) {
      if (data.price <= 0) {
        errors.push('Price must be greater than 0');
      }

      if (data.price > 999999.99) {
        errors.push('Price cannot exceed 999,999.99');
      }

      // Check for suspicious pricing (too low for certain product types)
      if (data.price < 0.01 && data.category) {
        // This could be enhanced with category-specific minimum pricing
        errors.push('Price seems too low for this product type');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Inventory business rule: Inventory must be non-negative and reasonable
   */
  async inventoryRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.inventory !== undefined) {
      if (data.inventory < 0) {
        errors.push('Inventory cannot be negative');
      }

      if (data.inventory > 999999) {
        errors.push('Inventory cannot exceed 999,999');
      }

      // Check for suspicious inventory levels
      if (data.inventory === 0 && data.isActive) {
        errors.push('Active products should have inventory available');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * SKU business rule: SKU must be unique and follow format
   */
  async skuRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.sku) {
      // SKU format validation
      if (!/^[A-Za-z0-9\-_]+$/.test(data.sku)) {
        errors.push(
          'SKU can only contain letters, numbers, hyphens, and underscores'
        );
      }

      if (data.sku.length > 100) {
        errors.push('SKU must be 100 characters or less');
      }

      // SKU should not be too short
      if (data.sku.length < 3) {
        errors.push('SKU must be at least 3 characters long');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Category business rule: Category must exist and be valid
   */
  async categoryRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.category !== undefined) {
      // Category validation will be handled by the middleware
      // This rule can be extended for category-specific business logic
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Pricing business rule: Compare price must be higher than regular price
   */
  async pricingRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.comparePrice !== undefined && data.price !== undefined) {
      if (data.comparePrice <= data.price) {
        errors.push('Compare price must be greater than regular price');
      }

      // Check for unreasonable price differences
      const priceDifference = data.comparePrice - data.price;
      const priceRatio = priceDifference / data.price;

      if (priceRatio > 5) {
        errors.push('Compare price difference seems too large');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate product status transitions
   */
  async validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Define valid status transitions
    const validTransitions: { [key: string]: string[] } = {
      draft: ['active', 'inactive'],
      active: ['inactive'],
      inactive: ['active'],
    };

    if (
      !validTransitions[currentStatus] ||
      !validTransitions[currentStatus].includes(newStatus)
    ) {
      errors.push(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate SEO fields
   */
  async validateSEOFields(seoData: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (seoData) {
      // Meta title validation
      if (seoData.metaTitle) {
        if (seoData.metaTitle.length > 60) {
          errors.push('Meta title should be 60 characters or less');
        }
        if (seoData.metaTitle.length < 10) {
          errors.push('Meta title should be at least 10 characters');
        }
      }

      // Meta description validation
      if (seoData.metaDescription) {
        if (seoData.metaDescription.length > 160) {
          errors.push('Meta description should be 160 characters or less');
        }
        if (seoData.metaDescription.length < 50) {
          errors.push('Meta description should be at least 50 characters');
        }
      }

      // Keywords validation
      if (seoData.keywords) {
        const keywords = seoData.keywords
          .split(',')
          .map((k: string) => k.trim());
        if (keywords.length > 10) {
          errors.push('Keywords should not exceed 10 items');
        }

        for (const keyword of keywords) {
          if (keyword.length > 50) {
            errors.push('Individual keywords should not exceed 50 characters');
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate bulk operation data
   */
  async validateBulkData(products: any[]): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!Array.isArray(products)) {
      errors.push('Bulk data must be an array');
      return { isValid: false, errors };
    }

    if (products.length === 0) {
      errors.push('Bulk data cannot be empty');
      return { isValid: false, errors };
    }

    if (products.length > 1000) {
      errors.push('Bulk operations are limited to 1000 products at a time');
      return { isValid: false, errors };
    }

    // Validate each product in the bulk data
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const result = await this.validateBusinessRules(product);

      if (!result.isValid) {
        result.errors.forEach(error => {
          errors.push(`Product ${i + 1}: ${error}`);
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
