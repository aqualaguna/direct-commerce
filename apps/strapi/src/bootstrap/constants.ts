export const LIFESPAN_7_DAYS_MILLIS = 7 * 24 * 3600 * 1000;

// Test admin panel users configuration
export const testAdminPanelUsers = [
  {
    email: 'admin@test.com',
    password: 'Admin123',
    username: 'admin',
    roleCode: 'strapi-super-admin',
    confirmed: true,
    isActive: true
  },
  {
    email: 'editor@test.com',
    password: 'Editor123',
    username: 'Editor',
    roleCode: 'strapi-editor',
    confirmed: true,
    isActive: true
  }
];

// Test customer users configuration
export const testCustomerUsers = [
  {
    email: 'customer@test.com',
    password: 'Customer123',
    username: 'Customer',
    roleType: 'authenticated', // Use default authenticated role
    confirmed: true,
    isActive: true
  }
];

// Test admin users configuration
export const testAdminUsers = [
  {
    email: 'admin-user@test.com',
    password: 'Admin123',
    username: 'Admin',
    roleType: 'admin', // Use default authenticated role
    confirmed: true,
    isActive: true
  }
];

