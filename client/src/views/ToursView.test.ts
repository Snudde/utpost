import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import { ref } from 'vue'
import { useQuery } from '@urql/vue'
import ToursView from './ToursView.vue'

// Vi mockar @urql/vue: vyn får det useQuery skulle ha gett, utan klient och utan nätverk.
// Testet handlar om vad vyn gör med svaret – att urql skickar anropet litar vi på.
vi.mock('@urql/vue', () => ({ useQuery: vi.fn() }))

const queryResult = (result: { data?: unknown; error?: unknown }) =>
  vi.mocked(useQuery).mockReturnValue({
    data: ref(result.data),
    error: ref(result.error),
    fetching: ref(false),
  } as unknown as ReturnType<typeof useQuery>)

const renderView = () =>
  render(ToursView, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })

describe('ToursView', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('visar turerna med användare, guide, längd och antal bilder', () => {
    queryResult({
      data: {
        tours: [
          {
            id: '7',
            title: 'Kvällstur',
            distanceM: 8400,
            user: { displayName: 'Johan Holm' },
            guide: { title: 'Kebnekaise' },
            photos: [{ id: '1' }, { id: '2' }],
          },
          {
            id: '8',
            title: 'Utan guide',
            distanceM: 1200,
            user: { displayName: 'Anna Berg' },
            guide: null,
            photos: [],
          },
        ],
      },
    })
    renderView()

    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('Johan Holm')).toBeInTheDocument()
    expect(screen.getByText('Kebnekaise')).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument() // turen utan guide
  })

  it('frågar bara efter fälten tabellen visar', () => {
    queryResult({ data: { tours: [] } })
    renderView()

    const query = vi.mocked(useQuery).mock.calls[0]![0].query
    const source = JSON.stringify(query)
    expect(source).toContain('displayName')
    // REST-svaret skickade mätpunkterna; tabellen behöver dem inte
    expect(source).not.toContain('logs')
  })

  it('visar laddning innan svaret kommit', () => {
    queryResult({})
    renderView()

    expect(screen.getByText('Laddar turer...')).toBeInTheDocument()
  })

  it('visar felet när frågan misslyckas', () => {
    queryResult({ error: new Error('[Network] Failed to fetch') })
    renderView()

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch')
  })
})
