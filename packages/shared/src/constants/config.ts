// Configuration Constants
export const APP_CONFIG = {
  NAME: 'Direct Commerce Platform',
  VERSION: '1.0.0',
  ENVIRONMENT: process.env['NODE_ENV'] || 'development',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
