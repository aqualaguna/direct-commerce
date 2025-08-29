import sharedConfig from '../../packages/config/prettier.config.js';

export default {
  // Extend from shared configuration
  ...sharedConfig,

  // Strapi-specific overrides
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: ['*.md'],
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
  ],
};
