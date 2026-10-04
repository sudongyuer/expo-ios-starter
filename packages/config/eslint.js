import expoConfig from 'eslint-config-expo/flat.js'
import prettierConfig from 'eslint-config-prettier/flat'

const nativeLoaders = [
  'requireNativeModule',
  'requireOptionalNativeModule',
  'requireNativeViewManager',
  'requireNativeView',
]

export const base = [
  ...expoConfig,
  prettierConfig,
  { ignores: ['dist/**', 'ios/**', '.expo/**', 'expo-env.d.ts'] },
]

export const app = [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['modules/starter-kit/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['expo', 'expo-modules-core'].map((name) => ({
            name,
            importNames: nativeLoaders,
            message:
              'Import native APIs from modules/starter-kit/src/index.ts only.',
          })),
        },
      ],
    },
  },
]

export const core = [
  ...base,
  { settings: { react: { version: '19.2' } } },
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'react-native',
                'react-native-*',
                'expo',
                'expo-*',
                '@expo/*',
                '@starter/mobile',
                '**/apps/**',
              ],
              message: 'packages/core is platform-neutral TypeScript.',
            },
          ],
        },
      ],
    },
  },
]
