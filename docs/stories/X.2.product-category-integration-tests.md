# Story X.2: Product and Category Integration Tests

## Status
Draft

## Story
**As a** development team,
**I want** comprehensive integration tests for Product and Category modules that verify CRUD operations, business logic, and database records,
**so that** we can ensure the core product catalog functionality works correctly in a real environment.

## Acceptance Criteria
1. Product module integration tests cover all CRUD operations
2. Product status transitions (draft/published) are tested
3. Product validation and error handling are tested
4. Product relationships (categories, variants, inventory) are tested
5. Category module integration tests cover all CRUD operations
6. Category hierarchy and parent-child relationships are tested
7. Category validation and constraints are tested
8. Category product associations are tested
9. All tests verify database records are created/updated/deleted correctly
10. Tests follow established testing standards and patterns

## Tasks / Subtasks

### Task 1: Product Module Integration Tests (AC: 1, 2, 3, 4, 9, 10)
- [ ] Create product integration tests in `apps/strapi/src/api/product/__tests__/product.integration.test.ts`
- [ ] Test product creation with database verification
- [ ] Test product retrieval and filtering
- [ ] Test product updates and validation
- [ ] Test product deletion and cleanup
- [ ] Test product status transitions (draft/published)
- [ ] Test product validation rules and error handling
- [ ] Test product search and filtering functionality
- [ ] Test product bulk operations
- [ ] Test product image upload and management

### Task 2: Product Relationships Testing (AC: 4, 9, 10)
- [ ] Test product-category associations
- [ ] Test product variant relationships
- [ ] Test product-inventory relationships
- [ ] Test product-option relationships
- [ ] Test product-listing relationships
- [ ] Test product cross-references and dependencies
- [ ] Test product relationship validation
- [ ] Test product relationship cleanup on deletion

### Task 3: Category Module Integration Tests (AC: 5, 6, 7, 8, 9, 10)
- [ ] Create category integration tests in `apps/strapi/src/api/category/__tests__/category.integration.test.ts`
- [ ] Test category creation with database verification
- [ ] Test category retrieval and filtering
- [ ] Test category updates and validation
- [ ] Test category deletion and cleanup
- [ ] Test category status management
- [ ] Test category validation rules and constraints
- [ ] Test category bulk operations

### Task 4: Category Hierarchy Testing (AC: 6, 9, 10)
- [ ] Test category parent-child relationships
- [ ] Test category tree structure validation
- [ ] Test category hierarchy navigation
- [ ] Test category inheritance and propagation
- [ ] Test category reordering and restructuring
- [ ] Test category depth limits and validation
- [ ] Test category circular reference prevention
- [ ] Test category hierarchy cleanup on deletion

### Task 5: Category-Product Associations (AC: 8, 9, 10)
- [ ] Test assigning products to categories
- [ ] Test removing products from categories
- [ ] Test product-category relationship validation
- [ ] Test category product counts and statistics
- [ ] Test category product filtering and sorting
- [ ] Test category product pagination
- [ ] Test category product relationship cleanup
- [ ] Test category product bulk operations

### Task 6: Business Logic and Edge Cases (AC: 3, 7, 9, 10)
- [ ] Test product uniqueness constraints (SKU, etc.)
- [ ] Test category uniqueness constraints
- [ ] Test product price validation and formatting
- [ ] Test category slug generation and validation
- [ ] Test product inventory validation
- [ ] Test category visibility and access control
- [ ] Test product-category relationship constraints
- [ ] Test data integrity and foreign key constraints

## Dev Notes

### Previous Story Insights
- Builds on Story X.1 (Integration Test Infrastructure) - uses the established test framework
- Extends existing Jest configuration and testing standards
- Leverages established testing patterns from `docs/architecture/test-standard.md`
- Integrates with existing Strapi 5 Document Service API patterns

### Testing Architecture
**Product Integration Test Example** [Source: architecture/test-standard.md#integration-tests]
```typescript
// Product Integration Test Example
describe('Product Integration Tests', () => {
  it('should create product and verify database record', async () => {
    const productData = {
      title: 'Test Product',
      description: 'Test description',
      price: 29.99,
      sku: 'TEST-001',
      status: 'draft'
    };
    
    // Create product via API
    const response = await request(app)
      .post('/api/products')
      .send({ data: productData })
      .expect(201);
    
    // Verify database record
    const dbRecord = await testDb.verifyRecord('api::product.product', {
      documentId: response.body.data.documentId
    });
    
    expect(dbRecord.title).toBe(productData.title);
    expect(dbRecord.price).toBe(productData.price);
  });
});
```

**Category Integration Test Example** [Source: architecture/test-standard.md#integration-tests]
```typescript
// Category Integration Test Example
describe('Category Integration Tests', () => {
  it('should create category hierarchy and verify relationships', async () => {
    // Create parent category
    const parentCategory = await testFactories.createCategory({
      name: 'Electronics',
      slug: 'electronics'
    });
    
    // Create child category
    const childCategory = await testFactories.createCategory({
      name: 'Smartphones',
      slug: 'smartphones',
      parent: parentCategory.documentId
    });
    
    // Verify hierarchy in database
    const dbChildCategory = await testDb.verifyRecord('api::category.category', {
      documentId: childCategory.documentId
    });
    
    expect(dbChildCategory.parent.documentId).toBe(parentCategory.documentId);
  });
});
```

### File Locations and Project Structure
**Product and Category Test Structure**
```
apps/strapi/src/api/
├── product/
│   ├── __tests__/
│   │   ├── product.integration.test.ts
│   │   └── product.unit.test.ts
│   ├── controllers/
│   ├── services/
│   └── routes/
├── category/
│   ├── __tests__/
│   │   ├── category.integration.test.ts
│   │   └── category.unit.test.ts
│   ├── controllers/
│   ├── services/
│   └── routes/
├── product-listing/
│   ├── __tests__/
│   │   └── product-listing.integration.test.ts
├── product-listing-variant/
│   ├── __tests__/
│   │   └── product-listing-variant.integration.test.ts
├── option-group/
│   ├── __tests__/
│   │   └── option-group.integration.test.ts
└── option-value/
    ├── __tests__/
    │   └── option-value.integration.test.ts
```

### Testing Requirements
**Integration Test Standards** [Source: architecture/test-standard.md#integration-tests]
- Use real PostgreSQL database connection
- Start Strapi dev server before test execution
- Verify database records after API operations
- Clean up test data after each test
- Follow established naming conventions and patterns
- Implement proper error handling and timeout management
- Use test data factories for consistent test data
- Implement test isolation through database transactions

**Product-Specific Test Requirements**
- Test all CRUD operations with database verification
- Test product status transitions (draft/published)
- Test product validation rules (price, SKU, etc.)
- Test product relationships (categories, variants, inventory)
- Test product search and filtering functionality
- Test product bulk operations
- Test product image upload and management

**Category-Specific Test Requirements**
- Test all CRUD operations with database verification
- Test category hierarchy and parent-child relationships
- Test category validation and constraints
- Test category product associations
- Test category status management
- Test category bulk operations
- Test category slug generation and validation

### Technical Constraints
**Strapi 5 Document Service API** [Source: architecture/test-standard.md#document-service-api-migration]
- Use Document Service API instead of deprecated Entity Service API
- Use `documentId` instead of numeric IDs
- Use `status` filters instead of `publishedAt` checks
- Implement proper draft/publish testing patterns
- Handle content type relationships correctly

**Product and Category Data Models**
- Test product price validation and formatting
- Test product SKU uniqueness constraints
- Test category slug generation and validation
- Test category hierarchy depth limits
- Test product-category relationship constraints
- Test data integrity and foreign key constraints

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-01-XX | 1.0 | Initial story creation | Scrum Master |

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4

### Debug Log References
- Product and category integration test implementation
- Database relationship testing and verification
- Business logic validation and edge case testing
- Test data factory implementation for products and categories

### Completion Notes List
- Comprehensive integration tests for Product and Category modules
- Real PostgreSQL database integration with proper test isolation
- Business logic validation and edge case testing
- Relationship testing between products and categories

### File List
**New Files Created:**
- `apps/strapi/src/api/product/__tests__/product.integration.test.ts`
- `apps/strapi/src/api/category/__tests__/category.integration.test.ts`
- `apps/strapi/src/api/product-listing/__tests__/product-listing.integration.test.ts`
- `apps/strapi/src/api/product-listing-variant/__tests__/product-listing-variant.integration.test.ts`
- `apps/strapi/src/api/option-group/__tests__/option-group.integration.test.ts`
- `apps/strapi/src/api/option-value/__tests__/option-value.integration.test.ts`

**Modified Files:**
- Test data factories for products and categories

## QA Results
*To be populated by QA Agent after implementation review*
