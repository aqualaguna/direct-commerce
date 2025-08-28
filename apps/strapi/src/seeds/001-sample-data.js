/**
 * Database Seeding Script for Strapi Ecommerce Platform
 *
 * This script populates the database with sample data for development and testing.
 * Run with: npx strapi database:seed
 */

module.exports = {
  async seed({ strapi }) {
    console.log('🌱 Starting database seeding...');

    try {
      // Create sample categories
      const categories = await createCategories(strapi);
      console.log('✅ Categories created successfully');

      // Create sample products
      const products = await createProducts(strapi, categories);
      console.log('✅ Products created successfully');

      // Create sample users
      const users = await createUsers(strapi);
      console.log('✅ Users created successfully');

      // Create sample addresses
      await createAddresses(strapi, users);
      console.log('✅ Addresses created successfully');

      // Create sample wishlist relationships
      await createWishlistRelationships(strapi, users, products);
      console.log('✅ Wishlist relationships created successfully');

      // Create sample SEO data
      await createSEOData(strapi, products, categories);
      console.log('✅ SEO data created successfully');

      console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  },
};

/**
 * Create sample categories
 */
async function createCategories(strapi) {
  const categoriesData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Books',
      slug: 'books',
      description: 'Books and literature',
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      isActive: true,
      sortOrder: 1,
    },
  ];

  const categories = [];
  for (const categoryData of categoriesData) {
    const category = await strapi.entityService.create(
      'api::category.category',
      {
        data: categoryData,
      }
    );
    categories.push(category);
  }

  // Set up category hierarchy (Smartphones is child of Electronics)
  const electronics = categories.find(c => c.slug === 'electronics');
  const smartphones = categories.find(c => c.slug === 'smartphones');

  if (electronics && smartphones) {
    await strapi.entityService.update(
      'api::category.category',
      smartphones.id,
      {
        data: {
          parent: electronics.id,
        },
      }
    );
  }

  return categories;
}

/**
 * Create sample products
 */
async function createProducts(strapi, categories) {
  const productsData = [
    {
      title: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description:
        'Latest iPhone with advanced features and cutting-edge technology',
      shortDescription: 'Premium smartphone with cutting-edge technology',
      price: 999.0,
      comparePrice: 1099.0,
      sku: 'IPHONE-15-PRO-001',
      inventory: 50,
      isActive: true,
      featured: true,
      category: categories.find(c => c.slug === 'smartphones')?.id,
    },
    {
      title: 'Samsung Galaxy S24',
      slug: 'samsung-galaxy-s24',
      description: 'Android flagship smartphone with high-performance features',
      shortDescription: 'High-performance Android device',
      price: 899.0,
      comparePrice: 999.0,
      sku: 'SAMSUNG-S24-001',
      inventory: 30,
      isActive: true,
      featured: false,
      category: categories.find(c => c.slug === 'smartphones')?.id,
    },
    {
      title: 'MacBook Pro 16"',
      slug: 'macbook-pro-16',
      description: 'Professional laptop for power users with M3 chip',
      shortDescription: '16-inch MacBook Pro with M3 chip',
      price: 2499.0,
      comparePrice: 2699.0,
      sku: 'MACBOOK-PRO-16-001',
      inventory: 20,
      isActive: true,
      featured: true,
      category: categories.find(c => c.slug === 'electronics')?.id,
    },
    {
      title: 'Nike Air Max 270',
      slug: 'nike-air-max-270',
      description: 'Comfortable running shoes with Air Max technology',
      shortDescription: 'Premium running shoes with Air Max technology',
      price: 129.99,
      comparePrice: 149.99,
      sku: 'NIKE-AIRMAX-270-001',
      inventory: 100,
      isActive: true,
      featured: false,
      category: categories.find(c => c.slug === 'clothing')?.id,
    },
    {
      title: 'The Great Gatsby',
      slug: 'the-great-gatsby',
      description: 'Classic American novel by F. Scott Fitzgerald',
      shortDescription: 'F. Scott Fitzgerald masterpiece',
      price: 12.99,
      comparePrice: 15.99,
      sku: 'BOOK-GATSBY-001',
      inventory: 200,
      isActive: true,
      featured: false,
      category: categories.find(c => c.slug === 'books')?.id,
    },
  ];

  const products = [];
  for (const productData of productsData) {
    const product = await strapi.entityService.create('api::product.product', {
      data: productData,
    });
    products.push(product);
  }

  return products;
}

/**
 * Create sample users
 */
async function createUsers(strapi) {
  const usersData = [
    {
      username: 'john_doe',
      email: 'john@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      isActive: true,
      emailVerified: true,
    },
    {
      username: 'jane_smith',
      email: 'jane@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567891',
      isActive: true,
      emailVerified: true,
    },
    {
      username: 'admin_user',
      email: 'admin@example.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567892',
      isActive: true,
      emailVerified: true,
    },
  ];

  const users = [];
  for (const userData of usersData) {
    const user = await strapi.plugins['users-permissions'].services.user.add({
      ...userData,
      role: userData.username === 'admin_user' ? 1 : 2, // 1 = admin, 2 = authenticated
    });
    users.push(user);
  }

  return users;
}

/**
 * Create sample addresses
 */
async function createAddresses(strapi, users) {
  const addressesData = [
    {
      type: 'shipping',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Tech Corp',
      address1: '123 Main St',
      address2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      phone: '+1234567890',
      isDefault: true,
      user: users.find(u => u.username === 'john_doe')?.id,
    },
    {
      type: 'billing',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Tech Corp',
      address1: '123 Main St',
      address2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      phone: '+1234567890',
      isDefault: true,
      user: users.find(u => u.username === 'john_doe')?.id,
    },
    {
      type: 'both',
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Design Studio',
      address1: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'USA',
      phone: '+1234567891',
      isDefault: true,
      user: users.find(u => u.username === 'jane_smith')?.id,
    },
  ];

  for (const addressData of addressesData) {
    await strapi.entityService.create('api::address.address', {
      data: addressData,
    });
  }
}

/**
 * Create sample wishlist relationships
 */
async function createWishlistRelationships(strapi, users, products) {
  const wishlistData = [
    {
      user: users.find(u => u.username === 'john_doe')?.id,
      product: products.find(p => p.slug === 'iphone-15-pro')?.id,
    },
    {
      user: users.find(u => u.username === 'john_doe')?.id,
      product: products.find(p => p.slug === 'macbook-pro-16')?.id,
    },
    {
      user: users.find(u => u.username === 'jane_smith')?.id,
      product: products.find(p => p.slug === 'samsung-galaxy-s24')?.id,
    },
    {
      user: users.find(u => u.username === 'jane_smith')?.id,
      product: products.find(p => p.slug === 'nike-air-max-270')?.id,
    },
  ];

  for (const wishlistItem of wishlistData) {
    if (wishlistItem.user && wishlistItem.product) {
      await strapi.entityService.update(
        'plugin::users-permissions.user',
        wishlistItem.user,
        {
          data: {
            wishlist: {
              connect: [wishlistItem.product],
            },
          },
        }
      );
    }
  }
}

/**
 * Create sample SEO data
 */
async function createSEOData(strapi, products, categories) {
  const seoData = [
    {
      entityId: products.find(p => p.slug === 'iphone-15-pro')?.id,
      entityType: 'api::product.product',
      metaTitle: 'iPhone 15 Pro - Premium Smartphone',
      metaDescription:
        'Get the latest iPhone 15 Pro with advanced features and cutting-edge technology',
      keywords: 'iPhone, smartphone, Apple, mobile',
      canonicalUrl: 'https://example.com/products/iphone-15-pro',
    },
    {
      entityId: categories.find(c => c.slug === 'electronics')?.id,
      entityType: 'api::category.category',
      metaTitle: 'Electronics - Latest Gadgets and Devices',
      metaDescription: 'Discover the latest electronic devices and gadgets',
      keywords: 'electronics, gadgets, devices, technology',
      canonicalUrl: 'https://example.com/categories/electronics',
    },
  ];

  for (const seoItem of seoData) {
    if (seoItem.entityId) {
      await strapi.entityService.create('api::shared.seo', {
        data: seoItem,
      });
    }
  }
}
