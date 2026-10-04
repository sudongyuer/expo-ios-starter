export type PresentationResult<R> =
  { status: 'completed'; value: R } | { status: 'cancelled' }

export interface PresentationEntry<P> {
  params: P
  settled: boolean
}

export interface OpenedPresentation<R> {
  id: string
  result: Promise<PresentationResult<R>>
}

export interface PresentationStore {
  open<P, R>(route: string, params: P): OpenedPresentation<R>
  read<P>(id: string, route: string): PresentationEntry<P> | undefined
  complete<R>(id: string, value: R): boolean
  cancel(id: string): boolean
  release(id: string): void
  size(): number
}

interface PresentationRecord {
  route: string
  params: unknown
  settled: boolean
  resolve: (result: PresentationResult<unknown>) => void
}

export interface PresentationStoreOptions {
  createId?: () => string
}

function counterIds(): () => string {
  let next = 0
  return () => `presentation-${(next += 1)}`
}

export function createPresentationStore({
  createId = counterIds(),
}: PresentationStoreOptions = {}): PresentationStore {
  const records = new Map<string, PresentationRecord>()

  function settle(id: string, result: PresentationResult<unknown>): boolean {
    const record = records.get(id)
    if (!record || record.settled) return false
    record.settled = true
    record.resolve(result)
    return true
  }

  return {
    open<P, R>(route: string, params: P): OpenedPresentation<R> {
      const id = createId()
      if (records.has(id)) throw new Error(`Duplicate presentation id ${id}`)
      let resolve!: (result: PresentationResult<unknown>) => void
      const result = new Promise<PresentationResult<R>>((done) => {
        resolve = done as (result: PresentationResult<unknown>) => void
      })
      records.set(id, {
        route,
        params,
        settled: false,
        resolve,
      })
      return { id, result }
    },

    read<P>(id: string, route: string): PresentationEntry<P> | undefined {
      const record = records.get(id)
      if (!record || record.route !== route) return undefined
      return { params: record.params as P, settled: record.settled }
    },

    complete<R>(id: string, value: R): boolean {
      return settle(id, { status: 'completed', value })
    },

    cancel(id: string): boolean {
      return settle(id, { status: 'cancelled' })
    },

    release(id: string): void {
      settle(id, { status: 'cancelled' })
      records.delete(id)
    },

    size(): number {
      return records.size
    },
  }
}
