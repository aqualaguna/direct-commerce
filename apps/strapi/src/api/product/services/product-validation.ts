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
      { name: 'nameRule', validate: this.nameRule },
      { name: 'brandRule', validate: this.brandRule },
      { validate: this.inventoryRule },
      { validate: this.skuRule },
      { validate: this.categoryRule },
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
   * Name business rule: Name must be valid and follow format
   */
  async nameRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('Name is required and must be a string');
      } else {
        if (data.name.trim().length === 0) {
          errors.push('Name cannot be empty');
        }

        if (data.name.length > 255) {
          errors.push('Name must be 255 characters or less');
        }

        if (data.name.length < 2) {
          errors.push('Name must be at least 2 characters long');
        }

        // Check for valid characters (letters, numbers, spaces, hyphens, apostrophes)
        if (!/^[a-zA-Z0-9\s\-'&.]+$/.test(data.name)) {
          errors.push('Name can only contain letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Brand business rule: Brand must be valid if provided
   */
  async brandRule(data: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (data.brand !== undefined && data.brand !== null) {
      if (typeof data.brand !== 'string') {
        errors.push('Brand must be a string');
      } else {
        if (data.brand.length > 100) {
          errors.push('Brand must be 100 characters or less');
        }

        if (data.brand.length > 0 && data.brand.length < 2) {
          errors.push('Brand must be at least 2 characters long if provided');
        }

        // Check for valid characters (letters, numbers, spaces, hyphens, apostrophes)
        if (data.brand.length > 0 && !/^[a-zA-Z0-9\s\-'&.]+$/.test(data.brand)) {
          errors.push('Brand can only contain letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods');
        }
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
      if (data.inventory === 0) {
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
