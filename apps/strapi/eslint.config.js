import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/dist/**', '**/build/**', '**/*.example.*', '**/.strapi/**', '**/coverage/**', '**/.tmp/**', '**/.cache/**'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        console: 'readonly',
        strapi: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'prettier/prettier': 'error',
      
      // TypeScript 5.9.2+ Enhanced Rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_', 
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Requires strictNullChecks
      '@typescript-eslint/prefer-optional-chain': 'off', // Requires project
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off', // Requires project
      '@typescript-eslint/no-unsafe-assignment': 'off', // Too noisy for migration
      '@typescript-eslint/no-unsafe-member-access': 'off', // Too noisy for migration
      '@typescript-eslint/no-unsafe-call': 'off', // Too noisy for migration
      '@typescript-eslint/no-unsafe-return': 'off', // Too noisy for migration
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'off', // Requires project
      '@typescript-eslint/no-import-type-side-effects': 'off', // Requires project
      
      // Modern JavaScript Features (ES2022+)
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': ['error', {
        array: true,
        object: true,
      }],
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      
      // Import/Export Standards
      'sort-imports': ['error', {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      }],
      
      // Code Quality
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-else-return': 'error',
      'no-useless-return': 'error',
      'no-nested-ternary': 'error',
      'complexity': ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      
      // Async/Await Best Practices
      'require-await': 'warn', // Too strict for migration
      'no-return-await': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // Error Handling
      'no-throw-literal': 'error',
      'no-unhandled-promise': 'off', // Handled by TypeScript
    },
  },
  {
    // Enhanced rules for test files
    files: [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.js',
      '**/tests/**/*.ts',
      '**/tests/**/*.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off',
      'max-depth': 'off',
      'require-await': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.js'],
    ignores: ['**/dist/**', '**/build/**', '**/*.example.*', '**/.strapi/**', '**/coverage/**', '**/.tmp/**', '**/.cache/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        console: 'readonly',
        strapi: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      
      // Modern JavaScript Features (ES2022+)
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': ['error', {
        array: true,
        object: true,
      }],
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      
      // Code Quality
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-else-return': 'error',
      'no-useless-return': 'error',
      'no-nested-ternary': 'error',
      'complexity': ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      
      // Error Handling
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'require-await': 'warn', // Consistent with TypeScript config
      
      // Variable Rules
      'no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_', 
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        },
      ],
    },
  },
];
