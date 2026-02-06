/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Look for tests in __tests__ folder
    testMatch: ['**/__tests__/**/*.test.ts'],
};
