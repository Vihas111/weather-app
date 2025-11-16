import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],

  testEnvironment: 'jest-environment-jsdom',

  moduleNameMapper: {
    '^jspdf$': '<rootDir>/src/__mocks__/jspdf.ts',
  },

  // ❗ MUST match Jest's virtual paths (src/app/... + src/components/...)
  coveragePathIgnorePatterns: [
    "<rootDir>/src/app/page.tsx",
    "<rootDir>/src/components/WeatherHistoryCharts.tsx",
  ],
};

export default createJestConfig(customJestConfig);
