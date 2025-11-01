import type { Core } from '@strapi/strapi';

export async function setupPublicPermissions(strapi: Core.Strapi) {
    try {
        // Get both public and authenticated roles
        const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'public' }
        });

        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' }
        });

        let adminRoles = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'admin' }
        });
        

        if (!publicRole) {
            console.warn('Public role not found, skipping permission setup');
            return;
        }

        if (!authenticatedRole) {
            console.warn('Authenticated role not found, skipping permission setup');
            return;
        }
        // Create end user roles for API authentication
        if(!adminRoles) {
            // create admin role for end users (not admin panel users)
            adminRoles = await strapi.query('plugin::users-permissions.role').create({
                data: {
                    type: 'admin',
                    name: 'Admin',
                    description: 'Admin role for end users',
                }
            });
            if(!adminRoles) {
                console.warn('Admin role not found, skipping permission setup');
                return;
            }
        }


        // Get the default permissions configuration from plugins config
        const pluginsConfig: any = strapi.config.get('plugin::users-permissions');
        const defaultPermissions = pluginsConfig?.defaultPermissions?.public;
        const defaultPermissionsAuthenticated = pluginsConfig?.defaultPermissions?.authenticated;
        const defaultPermissionsAdmin = pluginsConfig?.defaultPermissions?.admin;

        if (!defaultPermissions) {
            console.warn('No default permissions configuration found');
            return;
        }

        const { publicContentTypes, publicActions, customPermissions: customPermissionsPublic } = defaultPermissions;
        const { authenticatedContentTypes, authenticatedActions, customPermissions } = defaultPermissionsAuthenticated;
        const { adminContentTypes, adminActions, customPermissions: customPermissionsAdmin } = defaultPermissionsAdmin;
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
        // Set up admin permissions
        if (adminContentTypes && adminActions) {
            for (const contentType of adminContentTypes) {
                for (const action of adminActions) {
                    // Add permission for admin role
                    permissions.push({
                        action: `${contentType}.${action}`,
                        subject: null,
                        properties: {},
                        conditions: [],
                        role: adminRoles.id
                    });

                    // Add permission for authenticated role
                    permissions.push({
                        action: `${contentType}.${action}`,
                        subject: null,
                        properties: {},
                        conditions: [],
                        role: adminRoles.id
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
        if (customPermissionsAdmin) {
            for (const permission of customPermissionsAdmin) {
                permissions.push({...permission, role: adminRoles.id});
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

export async function setupUserSelfUpdatePermissions(strapi: Core.Strapi) {
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

