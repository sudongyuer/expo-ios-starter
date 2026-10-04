import type { AboutService } from '../about'

export const fixtureAboutService: AboutService = {
  getAboutInfo: () => ({ version: '1.2.3', build: '45' }),
}
