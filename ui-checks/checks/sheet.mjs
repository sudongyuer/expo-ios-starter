export const behavior =
  'present() opens the color picker as a modal: picking a color returns completed, the close button and a swipe down return cancelled, and a direct link shows the missing state.'

export const video = true

const footer = (ui, color) =>
  color
    ? ui.t('home.present.footerCompleted', { color: ui.t(`colors.${color}`) })
    : ui.t('home.present.footerCancelled')

async function pick(ui, color) {
  await ui.tap('home.color')
  await ui.tap(`pick-color.${color}`)
  await ui.gone(`pick-color.${color}`)
  await ui.valueOf('home.color', ui.t(`colors.${color}`))
  await ui.labelled(footer(ui, color))
}

export async function run(ui) {
  await ui.openScene('home', 'home.color')

  await ui.tap('home.color')
  for (const color of ['red', 'orange', 'green', 'blue', 'purple']) {
    ui.expectTarget(await ui.element(`pick-color.${color}`), color)
  }
  await ui.capture('sheet-open')
  await ui.tap('pick-color.green')
  await ui.gone('pick-color.green')
  await ui.valueOf('home.color', ui.t('colors.green'))
  await ui.labelled(footer(ui, 'green'))
  await ui.capture('completed')

  await ui.tap('home.color')
  await ui.element('pick-color.green')
  await ui.capture('sheet-checked')
  // Stack.Toolbar buttons expose no identifier; the label is the stable handle.
  await ui.tapLabel(ui.t('common.cancel'))
  await ui.gone('pick-color.green')
  await ui.labelled(footer(ui))
  await ui.capture('cancelled-close-button')

  await pick(ui, 'red')
  await ui.tap('home.color')
  await ui.element('pick-color.red')
  await ui.swipeDown()
  await ui.gone('pick-color.red')
  await ui.labelled(footer(ui))
  await ui.capture('cancelled-swipe')

  await ui.openScene('pick-color-missing', 'presentation-missing')
  await ui.labelled(ui.t('presentation.missingBody'))
  await ui.capture('missing')
  await ui.tapLabel(ui.t('common.close'))
  await ui.gone('presentation-missing')
}
