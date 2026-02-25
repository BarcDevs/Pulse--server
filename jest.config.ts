export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    testMatch: [
        '**/*.spec.ts',
        '**/*.test.ts'
    ],
    setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup/jestSetup.ts'
    ]
}
