import { uiVerify } from '@/lib/ui-verify'

import { type AboutService, liveAboutService } from './about'
import { fixtureAboutService } from './fixtures/about'

export type { AboutInfo, AboutService } from './about'

export const aboutService: AboutService = uiVerify
  ? fixtureAboutService
  : liveAboutService
