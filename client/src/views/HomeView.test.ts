import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/vue'
import { ref, unref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useQuery } from '@urql/vue'
import HomeView from './HomeView.vue'
import { useAuthStore } from '../stores/auth'

// Vi mockar @urql/vue: vyn får det useQuery skulle ha gett, utan klient och utan nätverk.
vi.mock('@urql/vue', () => ({ useQuery: vi.fn() }))

const queryResult = (result: { data?: unknown; error?: unknown }) =>
  vi.mocked(useQuery).mockReturnValue({
    data: ref(result.data),
    error: ref(result.error),
    fetching: ref(false),
  } as unknown as ReturnType<typeof useQuery>)

const renderView = () =>
  render(HomeView, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })

describe('HomeView', () => {
  // Vyn läser auth-storen (är besökaren redaktör?) – då behövs en Pinia.
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('visar startsidan från ett enda GraphQL-anrop', () => {
    queryResult({
      data: {
        guides: [
          {
            slug: 'kebnekaise',
            title: 'Kebnekaise',
            region: 'Lappland',
            difficulty: 'svår',
            lengthKm: 18,
          },
        ],
        popularGuides: [{ slug: 'kebnekaise', title: 'Kebnekaise', region: 'Lappland' }],
        regions: ['Lappland', 'Småland'],
        tours: [{ id: '7', title: 'Kvällstur', distanceM: 8400 }],
        notices: [
          {
            id: 'n1',
            title: 'Vinterguiderna är på väg',
            level: 'info',
            status: 'published',
            guideSlug: null,
            body: [{ runs: [{ text: 'Snart här.', bold: false, italic: false, href: null }] }],
          },
        ],
      },
    })
    renderView()

    expect(screen.getByText('1 guider i 2 landskap.')).toBeInTheDocument()
    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vinterguiderna är på väg' })).toBeInTheDocument()
    expect(useQuery).toHaveBeenCalledTimes(1)
  })

  it('låter en redaktör slå på förhandsgranskningen (preview: true)', async () => {
    queryResult({ data: { guides: [], popularGuides: [], regions: [], tours: [], notices: [] } })
    const auth = useAuthStore()
    auth.user = { role: 'editor' } as typeof auth.user
    renderView()

    const args = vi.mocked(useQuery).mock.calls[0]![0] as { variables: unknown }
    expect(unref(args.variables)).toEqual({ preview: false })
    await fireEvent.click(screen.getByRole('checkbox'))
    expect(unref(args.variables)).toEqual({ preview: true })
  })

  it('visar ingen förhandsgranskning för vanliga besökare', () => {
    queryResult({ data: { guides: [], popularGuides: [], regions: [], tours: [], notices: [] } })
    renderView()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('visar felet när GraphQL svarar med errors', () => {
    queryResult({
      error: new Error('[GraphQL] Cannot query field "titel" on type "Guide".'),
    })
    renderView()

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot query field')
  })
})
