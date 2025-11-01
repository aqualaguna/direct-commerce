import type { Core } from '@strapi/strapi';
import * as bcrypt from 'bcryptjs';
import { testAdminPanelUsers, testCustomerUsers, testAdminUsers } from './constants';

export async function createTestUsersIfNotExist(strapi: Core.Strapi) {
    try {
        // Create admin users
        for (const userData of testAdminPanelUsers) {
            // Check if user already exists
            const existingUser = await strapi.query('admin::user').findOne({
                where: { email: userData.email }
            });

            if (!existingUser) {
                // Hash the password
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                
                // Get the admin role by code
                const role = await strapi.query('admin::role').findOne({
                    where: { code: userData.roleCode }
                });

                if (!role) {
                    console.warn(`⚠️ Role with code '${userData.roleCode}' not found, skipping user creation for ${userData.email}`);
                    continue;
                }

                // Create the admin user
                await strapi.query('admin::user').create({
                    data: {
                        email: userData.email,
                        username: userData.username,
                        password: hashedPassword,
                        confirmed: userData.confirmed,
                        blocked: false,
                        isActive: userData.isActive,
                        roles: [role.id]
                    }
                });

                console.info(`✅ Created test admin user: ${userData.email} with role: ${role.name}`);
            } else {
                // Update existing user to ensure it's active
                await strapi.query('admin::user').update({
                    where: { id: existingUser.id },
                    data: {
                        isActive: userData.isActive,
                        confirmed: userData.confirmed,
                        blocked: false
                    }
                });
                console.info(`✅ Updated existing admin user: ${userData.email} - activated`);
            }
        }
    } catch (error) {
        console.error('Failed to create test admin users:', error);
    }
}

export async function createTestFrontendUsersIfNotExist(strapi: Core.Strapi) {
    try {
        for (const userData of testCustomerUsers) {
            // Check if user already exists
            const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
                where: { email: userData.email }
            });

            if (!existingUser) {
                // Hash the password
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                
                // Get the authenticated role by type
                const role = await strapi.query('plugin::users-permissions.role').findOne({
                    where: { type: userData.roleType }
                });

                if (!role) {
                    console.warn(`⚠️ Role with type '${userData.roleType}' not found, skipping user creation for ${userData.email}`);
                    continue;
                }

                // Create the frontend user
                await strapi.query('plugin::users-permissions.user').create({
                    data: {
                        email: userData.email,
                        username: userData.username,
                        password: hashedPassword,
                        confirmed: userData.confirmed,
                        blocked: false,
                        role: role.id,
                        isActive: userData.isActive,
                        emailVerified: true
                    }
                });

                console.info(`✅ Created test frontend user: ${userData.email} with role: ${role.name} (${role.type})`);
            } else {
                console.info(`ℹ️ Test frontend user already exists: ${userData.email}`);
            }
        }
        for (const userData of testAdminUsers) {
            // Check if user already exists
            const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
                where: { email: userData.email }
            });
          
            if (!existingUser) {
                // Hash the password
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                
                // Get the authenticated role by type
                const role = await strapi.query('plugin::users-permissions.role').findOne({
                    where: { type: userData.roleType }
                });

                if (!role) {
                    console.warn(`⚠️ Role with type '${userData.roleType}' not found, skipping user creation for ${userData.email}`);
                    continue;
                }

                // Create the frontend user
                await strapi.query('plugin::users-permissions.user').create({
                    data: {
                        email: userData.email,
                        username: userData.username,
                        password: hashedPassword,
                        confirmed: userData.confirmed,
                        blocked: false,
                        role: role.id,
                        isActive: userData.isActive,
                        emailVerified: true
                    }
                });

                console.info(`✅ Created test frontend user: ${userData.email} with role: ${role.name} (${role.type})`);
            } else {
                console.info(`ℹ️ Test frontend user already exists: ${userData.email}`);
            }
        }
    } catch (error) {
        console.error('Failed to create test frontend users:', error);
    }
}

