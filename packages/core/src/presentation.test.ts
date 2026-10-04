import { describe, expect, it } from 'vitest'

import { createPresentationStore } from './presentation'

const ROUTE = '/sheets/pick'

function setup() {
  const store = createPresentationStore()
  const opened = store.open<{ initial: string }, { color: string }>(ROUTE, {
    initial: 'blue',
  })
  return { store, ...opened }
}

describe('presentation store', () => {
  it('keeps params in memory and hands out a fresh id per presentation', () => {
    const store = createPresentationStore()
    const a = store.open(ROUTE, { initial: 'red' })
    const b = store.open(ROUTE, { initial: 'green' })
    expect(a.id).not.toBe(b.id)
    expect(store.read(a.id, ROUTE)).toEqual({
      params: { initial: 'red' },
      settled: false,
    })
  })

  it('resolves completed with the value', async () => {
    const { store, id, result } = setup()
    expect(store.complete(id, { color: 'green' })).toBe(true)
    await expect(result).resolves.toEqual({
      status: 'completed',
      value: { color: 'green' },
    })
  })

  it('resolves cancelled on cancel', async () => {
    const { store, id, result } = setup()
    expect(store.cancel(id)).toBe(true)
    await expect(result).resolves.toEqual({ status: 'cancelled' })
  })

  it('ignores every settlement after the first', async () => {
    const { store, id, result } = setup()
    expect(store.complete(id, { color: 'green' })).toBe(true)
    expect(store.complete(id, { color: 'red' })).toBe(false)
    expect(store.cancel(id)).toBe(false)
    store.release(id)
    await expect(result).resolves.toEqual({
      status: 'completed',
      value: { color: 'green' },
    })
  })

  it('ignores complete after cancel', async () => {
    const { store, id, result } = setup()
    store.cancel(id)
    expect(store.complete(id, { color: 'green' })).toBe(false)
    await expect(result).resolves.toEqual({ status: 'cancelled' })
  })

  it('treats an unknown id as missing without settling anything', () => {
    const { store, id } = setup()
    expect(store.read('presentation-404', ROUTE)).toBeUndefined()
    expect(store.complete('presentation-404', { color: 'x' })).toBe(false)
    expect(store.cancel('presentation-404')).toBe(false)
    store.release('presentation-404')
    expect(store.read(id, ROUTE)?.settled).toBe(false)
  })

  it('treats an id opened for another route as missing', () => {
    const { store, id } = setup()
    expect(store.read(id, '/sheets/other')).toBeUndefined()
  })

  it('cancels when the page goes away unsettled and frees the entry', async () => {
    const { store, id, result } = setup()
    store.release(id)
    await expect(result).resolves.toEqual({ status: 'cancelled' })
    expect(store.read(id, ROUTE)).toBeUndefined()
    expect(store.size()).toBe(0)
  })

  it('keeps params readable after settling until the page goes away', () => {
    const { store, id } = setup()
    store.complete(id, { color: 'green' })
    expect(store.read(id, ROUTE)).toEqual({
      params: { initial: 'blue' },
      settled: true,
    })
    store.release(id)
    expect(store.size()).toBe(0)
  })

  it('uses the injected id factory', () => {
    const store = createPresentationStore({ createId: () => 'fixed' })
    expect(store.open(ROUTE, {}).id).toBe('fixed')
    expect(() => store.open(ROUTE, {})).toThrow('Duplicate presentation id')
  })
})
