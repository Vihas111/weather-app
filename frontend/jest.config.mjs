import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.ts and .env
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Setup file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],

  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // ✅ Add this so Jest doesn't crash when running jspdf / canvas exports
  moduleNameMapper: {
    '^jspdf$': '<rootDir>/src/__mocks__/jspdf.ts',
  },
};

// Create the config using Next.js adapter
export default createJestConfig(customJestConfig);
