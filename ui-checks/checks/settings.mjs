export const behavior =
  'Settings renders the StarterKit grouped list; the demo switch turns on, and About shows the fixture version and build.'

export const video = false

export async function run(ui) {
  await ui.openScene('settings', 'settings.demo-toggle.toggle')
  for (const id of [
    'settings.demo-toggle',
    'settings.language',
    'settings.about',
  ]) {
    ui.expectTarget(await ui.element(id), id)
  }
  await ui.valueOf('settings.language', ui.t('settings.general.languageValue'))
  await ui.valueOf('settings.demo-toggle.toggle', '0')
  await ui.capture('settings')

  await ui.tap('settings.demo-toggle.toggle')
  await ui.valueOf('settings.demo-toggle.toggle', '1')
  await ui.capture('toggle-on')

  await ui.tap('settings.about')
  await ui.valueOf('about.version', '1.2.3')
  await ui.valueOf('about.build', '45')
  await ui.capture('about')
}
