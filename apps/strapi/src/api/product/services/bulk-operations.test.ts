/**
 * Bulk operations service tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock all dependencies
jest.mock('./product-validation', () => ({
  __esModule: true,
  default: {
    validateBusinessRules: jest.fn().mockResolvedValue({ isValid: true } as unknown as never),
    validateBulkData: jest.fn().mockResolvedValue({ isValid: true } as unknown as never),
  },
}));
jest.mock('./product');

const mockStrapi: any = {
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  service: jest.fn().mockReturnValue({
    validateBusinessRules: jest.fn().mockResolvedValue({ isValid: true } as unknown as never),
    validateStatusTransition: jest.fn().mockResolvedValue({ isValid: true } as unknown as never),
  }),
  log: {
    error: jest.fn(),
  },
};

// Mock the Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      return serviceFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Bulk Operations Service', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the actual service and create an instance
    const bulkOperationsService = require('./bulk-operations').default;
    service = bulkOperationsService({ strapi: mockStrapi });
  });

  describe('importFromCSV', () => {
    it('should import valid CSV data successfully', async () => {
      const csvData = `title,description,shortDescription,price,sku,inventory,isActive,featured,status
"Product 1","Description 1","Short 1",29.99,"SKU-001",10,true,false,draft
"Product 2","Description 2","Short 2",39.99,"SKU-002",5,true,true,active`;

      const mockCreatedProducts = [
        { id: 1, title: 'Product 1', sku: 'SKU-001' },
        { id: 2, title: 'Product 2', sku: 'SKU-002' },
      ];

      mockStrapi.entityService.create
        .mockResolvedValueOnce(mockCreatedProducts[0])
        .mockResolvedValueOnce(mockCreatedProducts[1]);

      const result = await service.importFromCSV(csvData);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(2);
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(2);
    });

    it('should handle missing required headers', async () => {
      const csvData = `title,description,price,sku
"Product 1","Description 1",29.99,"SKU-001"`;

      const result = await service.importFromCSV(csvData);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Missing required headers');
    });

    it('should handle validation errors', async () => {
      const csvData = `title,description,shortDescription,price,sku,inventory,isActive,featured,status
"Product 1","Description 1","Short 1",-10,"SKU-001",10,true,false,draft`;

      // Mock validation to fail for this test
      const productValidationService = require('./product-validation').default;
      productValidationService.validateBusinessRules.mockResolvedValueOnce({ 
        isValid: false, 
        errors: ['Price must be greater than 0'] 
      });

      const result = await service.importFromCSV(csvData);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Price must be greater than 0');
    });

    it('should validate only when validateOnly is true', async () => {
      const csvData = `title,description,shortDescription,price,sku,inventory,isActive,featured,status
"Product 1","Description 1","Short 1",29.99,"SKU-001",10,true,false,draft`;

      const result = await service.importFromCSV(csvData, { validateOnly: true });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockStrapi.entityService.create).not.toHaveBeenCalled();
    });
  });

  describe('importFromJSON', () => {
    it('should import valid JSON data successfully', async () => {
      const jsonData = [
        {
          title: 'Product 1',
          description: 'Description 1',
          shortDescription: 'Short 1',
          price: 29.99,
          sku: 'SKU-001',
          inventory: 10,
          isActive: true,
          featured: false,
          status: 'draft',
        },
        {
          title: 'Product 2',
          description: 'Description 2',
          shortDescription: 'Short 2',
          price: 39.99,
          sku: 'SKU-002',
          inventory: 5,
          isActive: true,
          featured: true,
          status: 'active',
        },
      ];

      const mockCreatedProducts = [
        { id: 1, title: 'Product 1', sku: 'SKU-001' },
        { id: 2, title: 'Product 2', sku: 'SKU-002' },
      ];

      mockStrapi.entityService.create
        .mockResolvedValueOnce(mockCreatedProducts[0])
        .mockResolvedValueOnce(mockCreatedProducts[1]);

      const result = await service.importFromJSON(jsonData);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(2);
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(2);
    });

    it('should handle validation errors in JSON data', async () => {
      const jsonData = [
        {
          title: 'Product 1',
          description: 'Description 1',
          shortDescription: 'Short 1',
          price: -10, // Invalid price
          sku: 'SKU-001',
          inventory: 10,
          isActive: true,
          featured: false,
          status: 'draft',
        },
      ];

      // Mock validation to fail for this test
      const productValidationService = require('./product-validation').default;
      productValidationService.validateBusinessRules.mockResolvedValueOnce({ 
        isValid: false, 
        errors: ['Price must be greater than 0'] 
      });

      const result = await service.importFromJSON(jsonData);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Price must be greater than 0');
    });
  });

  describe('exportToCSV', () => {
    it('should export products to CSV format', async () => {
      const mockProducts = [
        {
          id: 1,
          title: 'Export Product 1',
          description: 'Export description 1',
          shortDescription: 'Export short 1',
          price: 29.99,
          sku: 'EXPORT-001',
          inventory: 10,
          isActive: true,
          featured: false,
          status: 'active',
        },
        {
          id: 2,
          title: 'Export Product 2',
          description: 'Export description 2',
          shortDescription: 'Export short 2',
          price: 39.99,
          sku: 'EXPORT-002',
          inventory: 5,
          isActive: true,
          featured: true,
          status: 'active',
        },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.exportToCSV();

      expect(result).toContain('title,description,shortDescription,price,comparePrice,sku,inventory,isActive,featured,status,category,metaTitle,metaDescription,keywords');
      expect(result).toContain('Export Product 1');
      expect(result).toContain('Export Product 2');
      expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
    });
  });

  describe('exportToJSON', () => {
    it('should export products to JSON format', async () => {
      const mockProducts = [
        {
          id: 1,
          title: 'JSON Export Product 1',
          description: 'JSON export description 1',
          shortDescription: 'JSON export short 1',
          price: 29.99,
          sku: 'JSON-EXPORT-001',
          inventory: 10,
          isActive: true,
          featured: false,
          status: 'active',
        },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.exportToJSON();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('title', 'JSON Export Product 1');
      expect(result[0]).toHaveProperty('price', 29.99);
      expect(result[0]).toHaveProperty('sku', 'JSON-EXPORT-001');
      expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple products', async () => {
      const productIds = [1, 2];
      const newStatus = 'active';

      const mockUpdatedProducts = [
        { id: 1, title: 'Product 1', status: 'active' },
        { id: 2, title: 'Product 2', status: 'active' },
      ];

      // Mock the product service updateStatus method
      mockStrapi.service.mockReturnValue({
        updateStatus: jest.fn()
          .mockResolvedValueOnce(mockUpdatedProducts[0] as unknown as never)
          .mockResolvedValueOnce(mockUpdatedProducts[1] as unknown as never),
      });

      const result = await service.bulkUpdateStatus(productIds, newStatus);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockStrapi.service).toHaveBeenCalledWith('api::product.product');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple products', async () => {
      const productIds = [1, 2];

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 1, title: 'Product 1' })
        .mockResolvedValueOnce({ id: 2, title: 'Product 2' });

      mockStrapi.entityService.delete
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const result = await service.bulkDelete(productIds);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockStrapi.entityService.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateCSVTemplate', () => {
    it('should generate CSV template with headers', async () => {
      const template = service.generateCSVTemplate();

      expect(template).toContain('title,description,shortDescription,price,comparePrice,sku,inventory,isActive,featured,status,category,metaTitle,metaDescription,keywords');
      expect(template).toContain('Sample Product,This is a sample product description,Sample product short description,29.99,39.99,SAMPLE-001,10,true,false,draft,Electronics,Sample Product - Electronics,Sample product description for SEO,sample, product, electronics');
    });
  });
});
