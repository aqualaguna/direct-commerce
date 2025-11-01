import type { Core } from '@strapi/strapi';
import { setupPublicPermissions, setupUserSelfUpdatePermissions } from './permissions';
import { createTestUsersIfNotExist, createTestFrontendUsersIfNotExist } from './users';
import { createE2EBearerTokenIfNotExist, writeTokenToEnvFile } from './api-token';

export async function runBootstrap(strapi: Core.Strapi) {
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
}

