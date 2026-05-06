/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/utils/**/*.ts",
    "src/config/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/test/**",
    "!src/services/supabase/client.ts",
  ],
  modulePathIgnorePatterns: ["<rootDir>/../expo-sdk55/"],
};
