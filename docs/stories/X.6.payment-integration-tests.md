# Story X.6: Payment Integration Tests

## Status
Draft

## Story
**As a** development team,
**I want** comprehensive integration tests for Payment modules that verify payment processing, methods, confirmations, and review workflows,
**so that** we can ensure payment functionality works correctly in a real environment.

## Acceptance Criteria
1. Payment method integration tests cover all CRUD operations
2. Payment confirmation workflows are tested
3. Payment review and approval processes are tested
4. Manual payment handling is tested
5. Payment comments and communication are tested
6. All tests verify database records are created/updated/deleted correctly
7. Tests follow established testing standards and patterns

## Tasks / Subtasks

### Task 1: Payment Method Integration Tests (AC: 1, 6, 7)
- [ ] Create basic-payment-method integration tests in `apps/strapi/src/api/basic-payment-method/__tests__/basic-payment-method.integration.test.ts`
- [ ] Test payment method creation with database verification
- [ ] Test payment method retrieval and filtering
- [ ] Test payment method updates and validation
- [ ] Test payment method deletion and cleanup
- [ ] Test payment method validation and constraints
- [ ] Test payment method security and encryption
- [ ] Test payment method bulk operations

### Task 2: Payment Confirmation Integration Tests (AC: 2, 6, 7)
- [ ] Create payment-confirmation integration tests in `apps/strapi/src/api/payment-confirmation/__tests__/payment-confirmation.integration.test.ts`
- [ ] Test payment confirmation creation and management
- [ ] Test payment confirmation validation and constraints
- [ ] Test payment confirmation notifications
- [ ] Test payment confirmation templates and formatting
- [ ] Test payment confirmation delivery and tracking
- [ ] Test payment confirmation bulk operations

### Task 3: Payment Review Integration Tests (AC: 3, 6, 7)
- [ ] Create payment-review integration tests in `apps/strapi/src/api/payment-review/__tests__/payment-review.integration.test.ts`
- [ ] Test payment review creation and management
- [ ] Test payment review validation and constraints
- [ ] Test payment review approval workflows
- [ ] Test payment review notifications
- [ ] Test payment review history and audit trails
- [ ] Test payment review bulk operations

### Task 4: Manual Payment Integration Tests (AC: 4, 6, 7)
- [ ] Create manual-payment integration tests in `apps/strapi/src/api/manual-payment/__tests__/manual-payment.integration.test.ts`
- [ ] Test manual payment creation and management
- [ ] Test manual payment validation and constraints
- [ ] Test manual payment approval workflows
- [ ] Test manual payment notifications
- [ ] Test manual payment history and audit trails
- [ ] Test manual payment bulk operations

### Task 5: Payment Comment Integration Tests (AC: 5, 6, 7)
- [ ] Create payment-comment integration tests in `apps/strapi/src/api/payment-comment/__tests__/payment-comment.integration.test.ts`
- [ ] Test payment comment creation and management
- [ ] Test payment comment validation and constraints
- [ ] Test payment comment notifications
- [ ] Test payment comment history and audit trails
- [ ] Test payment comment bulk operations
- [ ] Test payment comment privacy and security

## Dev Notes

### Previous Story Insights
- Builds on Story X.1 (Integration Test Infrastructure) - uses the established test framework
- Extends existing Jest configuration and testing standards
- Leverages established testing patterns from `docs/architecture/test-standard.md`
- Integrates with existing Strapi 5 Document Service API patterns

### Testing Architecture
**Payment Method Integration Test Example** [Source: architecture/test-standard.md#integration-tests]
```typescript
// Payment Method Integration Test Example
describe('Payment Method Integration Tests', () => {
  it('should create payment method and verify database record', async () => {
    const user = await testFactories.createUser();
    const paymentMethodData = {
      user: user.documentId,
      type: 'credit_card',
      lastFour: '1234',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    };
    
    // Create payment method via API
    const response = await request(app)
      .post('/api/basic-payment-methods')
      .send({ data: paymentMethodData })
      .expect(201);
    
    // Verify database record
    const dbRecord = await testDb.verifyRecord('api::basic-payment-method.basic-payment-method', {
      documentId: response.body.data.documentId
    });
    
    expect(dbRecord.user.documentId).toBe(user.documentId);
    expect(dbRecord.type).toBe(paymentMethodData.type);
    expect(dbRecord.lastFour).toBe(paymentMethodData.lastFour);
  });
});
```

### File Locations and Project Structure
**Payment Test Structure**
```
apps/strapi/src/api/
├── basic-payment-method/
│   ├── __tests__/
│   │   └── basic-payment-method.integration.test.ts
├── payment-confirmation/
│   ├── __tests__/
│   │   └── payment-confirmation.integration.test.ts
├── payment-review/
│   ├── __tests__/
│   │   └── payment-review.integration.test.ts
├── manual-payment/
│   ├── __tests__/
│   │   └── manual-payment.integration.test.ts
└── payment-comment/
    ├── __tests__/
    │   └── payment-comment.integration.test.ts
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

**Payment-Specific Test Requirements**
- Test all CRUD operations with database verification
- Test payment method security and encryption
- Test payment confirmation workflows
- Test payment review and approval processes
- Test manual payment handling
- Test payment comments and communication
- Test payment validation and constraints

### Technical Constraints
**Strapi 5 Document Service API** [Source: architecture/test-standard.md#document-service-api-migration]
- Use Document Service API instead of deprecated Entity Service API
- Use `documentId` instead of numeric IDs
- Use `status` filters instead of `publishedAt` checks
- Implement proper draft/publish testing patterns
- Handle content type relationships correctly

**Payment Data Models**
- Test payment method security and encryption
- Test payment confirmation workflows
- Test payment review and approval processes
- Test manual payment handling
- Test payment comments and communication
- Test payment data integrity and relationships

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-01-XX | 1.0 | Initial story creation | Scrum Master |

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4

### Debug Log References
- Payment integration test implementation
- Payment method security testing
- Payment workflow testing
- Payment communication testing

### Completion Notes List
- Comprehensive integration tests for Payment modules
- Real PostgreSQL database integration with proper test isolation
- Payment method security and workflow testing
- Payment communication and review testing

### File List
**New Files Created:**
- `apps/strapi/src/api/basic-payment-method/__tests__/basic-payment-method.integration.test.ts`
- `apps/strapi/src/api/payment-confirmation/__tests__/payment-confirmation.integration.test.ts`
- `apps/strapi/src/api/payment-review/__tests__/payment-review.integration.test.ts`
- `apps/strapi/src/api/manual-payment/__tests__/manual-payment.integration.test.ts`
- `apps/strapi/src/api/payment-comment/__tests__/payment-comment.integration.test.ts`

**Modified Files:**
- Test data factories for payment-related entities

## QA Results
*To be populated by QA Agent after implementation review*
