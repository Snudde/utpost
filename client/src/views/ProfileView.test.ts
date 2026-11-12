import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useQuery } from '@urql/vue'
import ProfileView from './ProfileView.vue'
import { useAuthStore } from '@/stores/auth'
import { setToken } from '@/lib/token'

// Samma mönster som ToursView.test.ts: useQuery mockas, testet handlar om vad vyn gör med svaret.
vi.mock('@urql/vue', () => ({ useQuery: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const queryResult = (result: { data?: unknown; error?: unknown }) =>
  vi.mocked(useQuery).mockReturnValue({
    data: ref(result.data),
    error: ref(result.error),
    fetching: ref(false),
  } as unknown as ReturnType<typeof useQuery>)

const renderView = () =>
  render(ProfileView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

// M8: token ligger i minnet (lib/token.ts), inte i storen. Token först – isLoggedIn räknas om när user ändras.
const logIn = () => {
  setToken('token')
  useAuthStore().user = {
    id: 7,
    email: 'lisa@example.com',
    display_name: 'Lisa Waller',
    role: 'member',
    created_at: '2026-09-01T00:00:00.000Z',
  }
}

describe('ProfileView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setToken(null)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('säger till när ingen är inloggad', () => {
    queryResult({})
    renderView()
    expect(screen.getByText('Du är inte inloggad.')).toBeInTheDocument()
  })

  it('visar bara den inloggades turer', () => {
    logIn()
    queryResult({
      data: {
        tours: [
          { id: '1', title: 'Kvällstur', user: { id: '7' } },
          { id: '2', title: 'Någon annans tur', user: { id: '3' } },
          { id: '3', title: 'Morgontur', user: { id: '7' } },
        ],
      },
    })
    renderView()

    expect(screen.getByRole('heading', { name: 'Lisa Waller' })).toBeInTheDocument()
    expect(screen.getByText('Mina turer (2)')).toBeInTheDocument()
    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('Morgontur')).toBeInTheDocument()
    expect(screen.queryByText('Någon annans tur')).not.toBeInTheDocument()
  })
})
