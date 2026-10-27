import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import { ref } from 'vue'
import { useQuery } from '@urql/vue'
import HomeView from './HomeView.vue'

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
      },
    })
    renderView()

    expect(screen.getByText('1 guider i 2 landskap.')).toBeInTheDocument()
    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(useQuery).toHaveBeenCalledTimes(1)
  })

  it('visar felet när GraphQL svarar med errors', () => {
    queryResult({
      error: new Error('[GraphQL] Cannot query field "titel" on type "Guide".'),
    })
    renderView()

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot query field')
  })
})
