import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Кнопка виду таблиці мусить працювати без підключення: вибір памʼятає ядро.

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
  return (await import('../../src/components/tables/tableView')).TableViewState
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('table view', () => {
  it('is wide by default', async () => {
    const view = await load(memoryStorage())

    expect(view.current.value).toBe('wide')
  })

  it('remembers the choice in the browser without any project setup', async () => {
    const storage = memoryStorage()
    const view = await load(storage)

    view.toggle()

    expect(view.current.value).toBe('stacked')
    vi.resetModules()
    expect((await load(storage)).current.value).toBe('stacked')
  })

  it('works when the browser storage throws', async () => {
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    const view = await load(broken)

    view.set('stacked')

    expect(view.current.value).toBe('stacked')
  })

  it('takes the project storage first, the browser until it arrives', async () => {
    const storage = memoryStorage()
    storage.setItem('frontend-core:table-view', 'stacked')
    const account = ref<'wide' | 'stacked' | null>(null)
    const set = vi.fn((value: 'wide' | 'stacked') => { account.value = value })
    const view = await load(storage, { tableView: { get: () => account.value, set } })

    expect(view.current.value).toBe('stacked')

    account.value = 'wide'
    expect(view.current.value).toBe('wide')

    view.set('stacked')
    expect(set).toHaveBeenCalledWith('stacked')
    expect(storage.getItem('frontend-core:table-view')).toBe('stacked')
  })

  it('counts the sub cell as a column only in the wide view', async () => {
    const view = await load(memoryStorage())
    const plain = { columnDef: { meta: {} } }
    const withSub = { columnDef: { meta: { sub: { id: 'phone' } } } }
    const columns = [plain, withSub, plain] as never[]

    expect(view.cellCount(columns)).toBe(4)
    view.set('stacked')
    expect(view.cellCount(columns)).toBe(3)
  })
})
