import type { ExpoConfig } from 'expo/config'

const APP_NAME = 'Starter'
const SLUG = 'expo-ios-starter'
const SCHEME = 'starter'
const BUNDLE_ID = 'com.example.starter'
const IOS_DEPLOYMENT_TARGET = '26.0'

const config: ExpoConfig = {
  name: APP_NAME,
  slug: SLUG,
  version: '1.0.0',
  scheme: SCHEME,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  platforms: ['ios'],
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: process.env.BUILD_NUMBER ?? '1',
    deploymentTarget: IOS_DEPLOYMENT_TARGET,
    supportsTablet: false,
    icon: './assets/expo.icon',
    infoPlist: {
      CFBundleDevelopmentRegion: 'en',
      CFBundleLocalizations: ['en', 'zh-Hans'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    'expo-router',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#000000' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
}

export default config
