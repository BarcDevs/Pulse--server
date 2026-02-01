import js from '@eslint/js'
import typescript from 'typescript-eslint'
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintPluginImport from 'eslint-plugin-import'

export default [
    js.configs.recommended,
    ...typescript.configs.recommended,
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            'coverage/**',
            'prisma/migrations/**',
            'prisma/*.db',
            '.idea/**',
            '*.config.{js,ts,mjs}'
        ]
    },
    {
        files: ['**/*.{js,ts}'],
        plugins: {
            'simple-import-sort': eslintPluginSimpleImportSort,
            'import': eslintPluginImport
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module'
        },
        rules: {
            /** TypeScript rules */
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/no-require-imports': 'warn',
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports'
                }
            ],

            /** Node.js specific */
            'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
            'no-process-exit': 'warn',

            /** Import rules */
            'import/first': 'error',
            'import/newline-after-import': 'warn',
            'import/no-duplicates': 'error',

            /** Import sorting rules */
            'simple-import-sort/imports': [
                'warn',
                {
                    groups: [
                        /** Node.js built-ins */
                        ['^node:'],

                        /** Third-party packages */
                        ['^[^@.]'],

                        /** @-scoped packages */
                        ['^@(?!/)'],

                        /** Internal packages (@/*) */
                        ['^@/types'],
                        ['^@/interfaces'],
                        ['^@/constants'],
                        ['^@/config'],
                        ['^@/utils'],
                        ['^@/errors'],
                        ['^@/middlewares'],
                        ['^@/models'],
                        ['^@/schemas'],
                        ['^@/services'],
                        ['^@/controllers'],
                        ['^@/routes'],
                        ['^@/responses'],
                        ['^@/'],

                        /** Parent imports */
                        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

                        /** Same-folder imports */
                        ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$']
                    ]
                }
            ],
            'simple-import-sort/exports': 'warn',
            'no-empty-pattern': 'off'
        }
    },
    {
        files: ['**/__tests__/**/*.{js,ts}', '**/*.test.{js,ts}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off'
        }
    }
]