import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Ширини, підтягнуті руками, мусять памʼятатись і без підключення проєкту.

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

async function load(storage: unknown, config: object = {}) {
  vi.stubGlobal('localStorage', storage)
  const { SharedConfig } = await import('../../src/config')
  SharedConfig.configure({ labels: {}, ...config } as never)
  return (await import('../../src/components/tables/tableWidths')).TableWidthsState
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('column widths', () => {
  it('are all automatic until someone drags a border', async () => {
    const widths = await load(memoryStorage())

    expect(widths.get('reports')).toEqual({})
  })

  it('are remembered per table in the browser without any project setup', async () => {
    const storage = memoryStorage()
    const widths = await load(storage)

    widths.set('reports', { driver: 191, status: 215 })

    expect(widths.get('reports')).toEqual({ driver: 191, status: 215 })
    expect(widths.get('drivers')).toEqual({})
    vi.resetModules()
    expect((await load(storage)).get('reports')).toEqual({ driver: 191, status: 215 })
  })

  it('ignore a broken record and a throwing storage', async () => {
    const storage = memoryStorage()
    storage.setItem('frontend-core:column-widths:reports', '{"driver":"wide"')
    expect((await load(storage)).get('reports')).toEqual({})

    vi.resetModules()
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    const widths = await load(broken)
    widths.set('reports', { driver: 191 })

    expect(widths.get('reports')).toEqual({ driver: 191 })
  })

  it('take the project storage first, the browser until it arrives', async () => {
    const storage = memoryStorage()
    storage.setItem('frontend-core:column-widths:reports', '{"driver":180}')
    const account = ref<Record<string, number> | null>(null)
    const set = vi.fn((_key: string, value: Record<string, number>) => { account.value = value })
    const widths = await load(storage, { columnWidths: { get: () => account.value, set } })

    expect(widths.get('reports')).toEqual({ driver: 180 })

    account.value = { driver: 240 }
    expect(widths.get('reports')).toEqual({ driver: 240 })

    widths.set('reports', { driver: 200 })
    expect(set).toHaveBeenCalledWith('reports', { driver: 200 })
  })
})
