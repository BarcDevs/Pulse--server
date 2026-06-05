export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@exodus|html-encoding-sniffer|jsdom)/)'
    ],
    testMatch: [
        '**/*.integration.test.ts'
    ],
    setupFiles: [
        '<rootDir>/src/__tests__/integration/setup/envSetup.ts'
    ],
    setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/integration/setup/integrationSetup.ts'
    ],
    globalSetup: '<rootDir>/src/__tests__/integration/setup/globalSetup.ts',
    testTimeout: 30000,
    maxWorkers: 1
}
