export const behavior =
  'Home shows the present() example: a Color row with no value chosen yet, the idle footer, and a 44 pt touch target.'

export const video = false

export async function run(ui) {
  await ui.openScene('home', 'home.color')
  const row = await ui.valueOf('home.color', ui.t('home.present.none'))
  ui.expectTarget(row, 'home.color')
  await ui.labelled(ui.t('home.present.footerIdle'))
  await ui.capture('home')
}
