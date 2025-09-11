/**
 * Bulk operations service tests
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock all dependencies
jest.mock('./product-validation', () => ({
  __esModule: true,
  default: {
    validateBusinessRules: jest
      .fn()
      .mockResolvedValue({ isValid: true } as unknown as never),
    validateBulkData: jest
      .fn()
      .mockResolvedValue({ isValid: true } as unknown as never),
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
    validateBusinessRules: jest
      .fn()
      .mockResolvedValue({ isValid: true } as unknown as never),
    validateStatusTransition: jest
      .fn()
      .mockResolvedValue({ isValid: true } as unknown as never),
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
      const csvData = `name,brand,description,sku,inventory,status
"Product 1","Brand 1","Description 1","SKU-001",10,draft
"Product 2","Brand 2","Description 2","SKU-002",5,active`;

      const mockCreatedProducts = [
        { id: 1, name: 'Product 1', brand: 'Brand 1', sku: 'SKU-001' },
        { id: 2, name: 'Product 2', brand: 'Brand 2', sku: 'SKU-002' },
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
      const csvData = `name,brand,description,sku
"Product 1","Brand 1","Description 1","SKU-001"`;

      const result = await service.importFromCSV(csvData);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Missing required headers');
    });

    it('should validate only when validateOnly is true', async () => {
      const csvData = `name,brand,description,sku,inventory,status
"Product 1","Brand 1","Description 1","SKU-001",10,draft`;

      const result = await service.importFromCSV(csvData, {
        validateOnly: true,
      });

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
          sku: 'SKU-001',
          inventory: 10,
          status: 'draft',
        },
        {
          title: 'Product 2',
          description: 'Description 2',
          sku: 'SKU-002',
          inventory: 5,
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
  });

  describe('exportToCSV', () => {
    it('should export products to CSV format', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Export Product 1',
          brand: 'Export brand 1',
          description: 'Export description 1',
          sku: 'EXPORT-001',
          inventory: 10,
          status: 'active',
        },
        {
          id: 2,
          name: 'Export Product 2',
          brand: 'Export brand 2',
          description: 'Export description 2',
          sku: 'EXPORT-002',
          inventory: 5,
          status: 'active',
        },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.exportToCSV();

      expect(result).toContain(
        'name,brand,description,sku,inventory,status,category'
      );
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
          sku: 'JSON-EXPORT-001',
          inventory: 10,
          status: 'active',
        },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.exportToJSON();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('title', 'JSON Export Product 1');
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
        updateStatus: jest
          .fn()
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

      expect(template).toContain(
        'name,brand,description,sku,inventory,status,category'
      );
      expect(template).toContain(
        'Sample Product,This is a sample product brand,Sample product short description,SAMPLE-001,10,draft,Electronics'
      );
    });
  });
});
