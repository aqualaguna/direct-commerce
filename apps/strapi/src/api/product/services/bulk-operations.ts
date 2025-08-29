/**
 * Bulk operations service for product import/export
 */

import productValidationService from './product-validation';

interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  results: any[];
}

interface BulkExportOptions {
  format: 'csv' | 'json';
  filters?: any;
  fields?: string[];
  includeRelations?: boolean;
}

interface CSVRow {
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number;
  sku: string;
  inventory: number;
  isActive: boolean;
  featured: boolean;
  status: string;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Import products from CSV data
   */
  async importFromCSV(
    csvData: string,
    options: { validateOnly?: boolean } = {}
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // Validate headers
      const requiredHeaders = [
        'title',
        'description',
        'shortDescription',
        'price',
        'sku',
        'inventory',
      ];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        result.errors.push({
          row: 0,
          error: `Missing required headers: ${missingHeaders.join(', ')}`,
        });
        result.failed = lines.length - 1;
        return result;
      }

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = this.parseCSVLine(line);

        if (values.length !== headers.length) {
          result.errors.push({
            row: i + 1,
            error: `Column count mismatch. Expected ${headers.length}, got ${values.length}`,
          });
          result.failed++;
          continue;
        }

        // Create product data object
        const productData: any = {};
        headers.forEach((header, index) => {
          const value = values[index].trim();

          // Convert data types
          switch (header) {
            case 'price':
            case 'comparePrice':
              productData[header] = parseFloat(value) || 0;
              break;
            case 'inventory':
              productData[header] = parseInt(value) || 0;
              break;
            case 'isActive':
            case 'featured':
              productData[header] = value.toLowerCase() === 'true';
              break;
            default:
              productData[header] = value;
          }
        });

        // Validate product data
        const validationResult =
          await productValidationService.validateBusinessRules(productData);

        if (!validationResult.isValid) {
          result.errors.push({
            row: i + 1,
            error: validationResult.errors.join(', '),
            data: productData,
          });
          result.failed++;
          continue;
        }

        if (!options.validateOnly) {
          try {
            // Create product
            const createdProduct = await strapi.entityService.create(
              'api::product.product',
              {
                data: productData,
                populate: ['images', 'category', 'seo'],
              }
            );

            result.results.push(createdProduct);
            result.success++;
          } catch (error) {
            result.errors.push({
              row: i + 1,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: productData,
            });
            result.failed++;
          }
        } else {
          result.success++;
        }
      }
    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.failed = csvData.trim().split('\n').length - 1;
    }

    return result;
  },

  /**
   * Import products from JSON data
   */
  async importFromJSON(
    jsonData: any[],
    options: { validateOnly?: boolean } = {}
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    try {
      for (let i = 0; i < jsonData.length; i++) {
        const productData = jsonData[i];

        // Validate product data
        const validationResult =
          await productValidationService.validateBusinessRules(productData);

        if (!validationResult.isValid) {
          result.errors.push({
            row: i + 1,
            error: validationResult.errors.join(', '),
            data: productData,
          });
          result.failed++;
          continue;
        }

        if (!options.validateOnly) {
          try {
            // Create product
            const createdProduct = await strapi.entityService.create(
              'api::product.product',
              {
                data: productData,
                populate: ['images', 'category', 'seo'],
              }
            );

            result.results.push(createdProduct);
            result.success++;
          } catch (error) {
            result.errors.push({
              row: i + 1,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: productData,
            });
            result.failed++;
          }
        } else {
          result.success++;
        }
      }
    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.failed = jsonData.length;
    }

    return result;
  },

  /**
   * Export products to CSV
   */
  async exportToCSV(
    options: BulkExportOptions = { format: 'csv' }
  ): Promise<string> {
    try {
      const products = await strapi.entityService.findMany(
        'api::product.product',
        {
          filters: options.filters || {},
          populate: {
            category: {
              fields: ['name'],
            },
            seo: true,
          },
        }
      );

      if (products.length === 0) {
        return '';
      }

      // Define CSV headers
      const headers = [
        'title',
        'description',
        'shortDescription',
        'price',
        'comparePrice',
        'sku',
        'inventory',
        'isActive',
        'featured',
        'status',
        'category',
        'metaTitle',
        'metaDescription',
        'keywords',
      ];

      // Create CSV content
      let csvContent = `${headers.join(',')}\n`;

      for (const product of products) {
        const row = [
          this.escapeCSVValue(product.title),
          this.escapeCSVValue(product.description),
          this.escapeCSVValue(product.shortDescription),
          product.price,
          product.comparePrice || '',
          this.escapeCSVValue(product.sku),
          product.inventory,
          product.isActive,
          product.featured,
          (product as any).status || 'draft',
          this.escapeCSVValue((product as any).category?.name || ''),
          this.escapeCSVValue((product as any).seo?.metaTitle || ''),
          this.escapeCSVValue((product as any).seo?.metaDescription || ''),
          this.escapeCSVValue((product as any).seo?.keywords || ''),
        ];

        csvContent += `${row.join(',')}\n`;
      }

      return csvContent;
    } catch (error) {
      strapi.log.error('Error exporting products to CSV:', error);
      throw error;
    }
  },

  /**
   * Export products to JSON
   */
  async exportToJSON(
    options: BulkExportOptions = { format: 'json' }
  ): Promise<any[]> {
    try {
      const products = await strapi.entityService.findMany(
        'api::product.product',
        {
          filters: options.filters || {},
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'],
            },
            seo: true,
          },
        }
      );

      return products;
    } catch (error) {
      strapi.log.error('Error exporting products to JSON:', error);
      throw error;
    }
  },

  /**
   * Bulk update product status
   */
  async bulkUpdateStatus(
    productIds: number[],
    newStatus: string
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ productId: number; error: string }>;
    results: any[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    for (const productId of productIds) {
      try {
        const updatedProduct = await strapi
          .service('api::product.product')
          .updateStatus(productId, newStatus);
        result.results.push(updatedProduct);
        result.success++;
      } catch (error) {
        result.errors.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failed++;
      }
    }

    return result;
  },

  /**
   * Bulk update product fields
   */
  async bulkUpdateFields(
    productIds: number[],
    updateData: any
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ productId: number; error: string }>;
    results: any[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    for (const productId of productIds) {
      try {
        const updatedProduct = await strapi.entityService.update(
          'api::product.product',
          productId,
          {
            data: updateData,
            populate: ['images', 'category', 'seo'],
          }
        );
        result.results.push(updatedProduct);
        result.success++;
      } catch (error) {
        result.errors.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failed++;
      }
    }

    return result;
  },

  /**
   * Bulk delete products
   */
  async bulkDelete(productIds: number[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ productId: number; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const productId of productIds) {
      try {
        await strapi.entityService.delete('api::product.product', productId);
        result.success++;
      } catch (error) {
        result.errors.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failed++;
      }
    }

    return result;
  },

  /**
   * Parses a single line of a CSV file into an array of strings.
   * Handles quoted fields and escaped quotes.
   * @param line - The CSV line to parse.
   * @returns An array of string values.
   */
  parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  },

  /**
   * Escape CSV value for proper formatting
   */
  escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  },

  /**
   * Generate CSV template for import
   */
  generateCSVTemplate(): string {
    const headers = [
      'title',
      'description',
      'shortDescription',
      'price',
      'comparePrice',
      'sku',
      'inventory',
      'isActive',
      'featured',
      'status',
      'category',
      'metaTitle',
      'metaDescription',
      'keywords',
    ];

    const exampleRow = [
      'Sample Product',
      'This is a sample product description',
      'Sample product short description',
      '29.99',
      '39.99',
      'SAMPLE-001',
      '10',
      'true',
      'false',
      'draft',
      'Electronics',
      'Sample Product - Electronics',
      'Sample product description for SEO',
      'sample, product, electronics',
    ];

    return `${headers.join(',')}\n${exampleRow.join(',')}`;
  },
});
