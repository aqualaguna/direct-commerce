module.exports = {
  root: true,
  extends: ['./packages/config/eslint'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.cache/',
    '.tmp/',
    '.nx/',
    '.bmad-core/',
    '.bmad-infrastructure-devops/',
    '.claude/',
    'temp-nx-workspace/',
  ],
};
