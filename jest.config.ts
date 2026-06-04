export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@exodus|html-encoding-sniffer|jsdom)/)'
    ],
    testMatch: [
        '**/*.spec.ts',
        '**/*.test.ts'
    ],
    setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup/jestSetup.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 83,
            lines: 87,
            statements: 87
        }
    }
}
