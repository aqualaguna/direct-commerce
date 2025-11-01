import type { Core } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';
import { LIFESPAN_7_DAYS_MILLIS } from './constants';

export async function createE2EBearerTokenIfNotExist(strapi: Core.Strapi) {
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
                lifespan: LIFESPAN_7_DAYS_MILLIS,
            });
            return accessKey;
        }
    }
}

export async function writeTokenToEnvFile(token: string) {
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

