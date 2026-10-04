import * as Application from 'expo-application'

export interface AboutInfo {
  version: string
  build: string
}

export interface AboutService {
  getAboutInfo(): AboutInfo
}

export const liveAboutService: AboutService = {
  getAboutInfo: () => ({
    version: Application.nativeApplicationVersion ?? '—',
    build: Application.nativeBuildVersion ?? '—',
  }),
}
