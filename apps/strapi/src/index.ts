import type { Core } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const lifespan_7_days_millis = 7 * 24 * 3600 * 1000;

// Test users configuration
const testAdminUsers = [
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

const testCustomerUsers = [
  {
    email: 'customer@test.com',
    password: 'Customer123',
    username: 'Customer',
    roleType: 'authenticated', // Use default authenticated role
    confirmed: true,
    isActive: true
  },
];

// Removed custom role creation - using default Strapi roles

async function setupPublicPermissions(strapi: Core.Strapi) {
    try {
        // Get both public and authenticated roles
        const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'public' }
        });

        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' }
        });


        if (!publicRole) {
            console.warn('Public role not found, skipping permission setup');
            return;
        }

        if (!authenticatedRole) {
            console.warn('Authenticated role not found, skipping permission setup');
            return;
        }


        // Get the default permissions configuration from plugins config
        const pluginsConfig: any = strapi.config.get('plugin::users-permissions');
        const defaultPermissions = pluginsConfig?.defaultPermissions?.public;
        const defaultPermissionsAuthenticated = pluginsConfig?.defaultPermissions?.authenticated;

        if (!defaultPermissions) {
            console.warn('No default permissions configuration found');
            return;
        }

        const { publicContentTypes, publicActions, customPermissions: customPermissionsPublic } = defaultPermissions;
        const { authenticatedContentTypes, authenticatedActions, customPermissions } = defaultPermissionsAuthenticated;

        // Set up permissions for both public and authenticated roles
        const permissions = [];
        
        // Set up public permissions
        if (publicContentTypes && publicActions) {
            for (const contentType of publicContentTypes) {
                for (const action of publicActions) {
                    // Add permission for public role
                    permissions.push({
                        action: `${contentType}.${action}`,
                        subject: null,
                        properties: {},
                        conditions: [],
                        role: publicRole.id
                    });

                    // Add permission for authenticated role
                    permissions.push({
                        action: `${contentType}.${action}`,
                        subject: null,
                        properties: {},
                        conditions: [],
                        role: authenticatedRole.id
                    });
                }
            }
        }

        // Set up authenticated-only permissions
        if (authenticatedContentTypes && authenticatedActions) {
            for (const contentType of authenticatedContentTypes) {
                for (const action of authenticatedActions) {
                    // Add permission for authenticated role only
                    permissions.push({
                        action: `${contentType}.${action}`,
                        subject: null,
                        properties: {},
                        conditions: [],
                        role: authenticatedRole.id
                    });
                }
            }
        }
        if (customPermissions) {
            for (const permission of customPermissions) {
                permissions.push({...permission, role: authenticatedRole.id});
            }
        }
        if (customPermissionsPublic) {
            for (const permission of customPermissionsPublic) {
                permissions.push({...permission, role: publicRole.id});
            }
        }

        for (const permission of permissions) {
            // Check if permission already exists
            const existingPermission = await strapi.query('plugin::users-permissions.permission').findOne({
                where: {
                    action: permission.action,
                    role: permission.role
                }
            });

            if (!existingPermission) {
                await strapi.query('plugin::users-permissions.permission').create({
                    data: permission
                });
                const roleType = permission.role === publicRole.id ? 'public' : 'authenticated';
                console.info(`✅ Created ${roleType} permission: ${permission.action}`);
            } else {
                const roleType = permission.role === publicRole.id ? 'public' : 'authenticated';
                console.info(`ℹ️ ${roleType} permission already exists: ${permission.action}`);
            }
        }
    } catch (error) {
        console.error('Failed to setup public permissions:', error);
    }
}

async function setupUserSelfUpdatePermissions(strapi: Core.Strapi) {
    try {
        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' }
        });

        if (!authenticatedRole) {
            console.warn('Authenticated role not found, skipping user self-update permission setup');
            return;
        }

        // Add permission for users to update user profiles (policy will restrict to own profile)
        const selfUpdatePermission = {
            action: 'plugin::users-permissions.user.update',
            subject: null,
            properties: {},
            conditions: [],
            role: authenticatedRole.id
        };

        // Check if permission already exists
        const existingPermission = await strapi.query('plugin::users-permissions.permission').findOne({
            where: {
                action: selfUpdatePermission.action,
                role: selfUpdatePermission.role
            }
        });

        if (!existingPermission) {
            await strapi.query('plugin::users-permissions.permission').create({
                data: selfUpdatePermission
            });
            console.info(`✅ Created authenticated user update permission: ${selfUpdatePermission.action} (restricted by policy)`);
        } else {
            console.info(`ℹ️ Authenticated user update permission already exists: ${selfUpdatePermission.action}`);
        }
    } catch (error) {
        console.error('Failed to setup user self-update permissions:', error);
    }
}


async function createE2EBearerTokenIfNotExist(strapi: Core.Strapi) {
    const tokenService = strapi.service('admin::api-token');
    if (tokenService && tokenService.create) {
        const tokenAlreadyExists = await tokenService.exists({
            name: 'e2e-tests-token',
        });
        if (tokenAlreadyExists) {
            console.info(`an api token named 'e2e-tests-token' already exists, retrieving...`);
            // Get the existing token to sync to .env.test
            const existingTokens = await tokenService.list();
            const e2eToken = existingTokens.find(token => token.name === 'e2e-tests-token');
            if (e2eToken) {
                return e2eToken.accessKey;
            }
        }
        else {
            console.info(`creating 'e2e-tests-token' api token`);
            const { accessKey } = await tokenService.create({
                name: 'e2e-tests-token',
                type: 'full-access',
                lifespan: lifespan_7_days_millis,
            });
            return accessKey;
        }
    }
}

async function createTestUsersIfNotExist(strapi: Core.Strapi) {
    try {
        // Create admin users
        for (const userData of testAdminUsers) {
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

async function createTestFrontendUsersIfNotExist(strapi: Core.Strapi) {
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
    } catch (error) {
        console.error('Failed to create test frontend users:', error);
    }
}

async function writeTokenToEnvFile(token: string) {
    if (!token) return;
    
    const envTestPath = path.join(process.cwd(), '.env.test');
    let existingContent = '';
    
    try {
        if (fs.existsSync(envTestPath)) {
            existingContent = fs.readFileSync(envTestPath, 'utf8');
            
            // Check if STRAPI_API_TOKEN already exists
            const tokenRegex = /^STRAPI_API_TOKEN=(.*)$/m;
            const match = existingContent.match(tokenRegex);
            
            if (match) {
                const existingToken = match[1];
                if (existingToken === token) {
                    console.info('STRAPI_API_TOKEN already exists with same value in .env.test, skipping...');
                    return;
                } else {
                    console.info('STRAPI_API_TOKEN exists but with different value, updating...');
                    // Replace the existing token value
                    const newContent = existingContent.replace(tokenRegex, `STRAPI_API_TOKEN=${token}`);
                    fs.writeFileSync(envTestPath, newContent, 'utf8');
                    console.info(`API token updated in .env.test file`);
                    return;
                }
            }
        }
        
        // If no existing token found, append new token
        const newContent = existingContent ? 
            `${existingContent.trim()}\n\n# E2E Test API Token\nSTRAPI_API_TOKEN=${token}\n` :
            `# E2E Test API Token\nSTRAPI_API_TOKEN=${token}\n`;
            
        fs.writeFileSync(envTestPath, newContent, 'utf8');
        console.info(`API token written to .env.test file`);
    } catch (error) {
        console.error('Failed to write token to .env.test:', error);
        return;
    }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
      // Create API token for E2E tests
      const apiToken = await createE2EBearerTokenIfNotExist(strapi);
      if (apiToken) {
        await writeTokenToEnvFile(apiToken);
      }

        // Using default Strapi roles - no custom role creation needed

      // Set up public permissions for categories
      await setupPublicPermissions(strapi);

      // Set up user self-update permissions (using policy-based restriction)
      await setupUserSelfUpdatePermissions(strapi);

      // Create test admin users (roles already exist in admin panel)
      await createTestUsersIfNotExist(strapi);
      
      // Create test frontend users
      await createTestFrontendUsersIfNotExist(strapi);
  },
};
