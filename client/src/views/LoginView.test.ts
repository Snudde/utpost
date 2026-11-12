import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from './LoginView.vue'
import { post } from '../api'
import { getToken } from '../lib/token'
import { useAuthStore } from '../stores/auth'

vi.mock('../api', () => ({ post: vi.fn() }))
const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: { till: '/turer/1/bild' } }),
}))
const mockedPost = vi.mocked(post)

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('E-post'), 'anna@example.com')
  await user.type(screen.getByLabelText('Lösenord'), 'hemligt123')
  await user.click(screen.getByRole('button', { name: 'Logga in' }))
}

describe('LoginView (M8)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().logout()
    push.mockClear()
  })

  it('fel uppgifter: API:ets felsvar visas som alert, ingen token sparas', async () => {
    mockedPost.mockResolvedValue({ error: 'fel e-post eller lösenord' })
    const user = userEvent.setup()
    render(LoginView)
    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('fel e-post eller lösenord')
    expect(getToken()).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })

  it('rätt uppgifter: token hamnar i minnet, aldrig i localStorage, och vi skickas dit vi var på väg', async () => {
    mockedPost.mockResolvedValue({
      token: 'jwt-fran-api',
      user: {
        id: 1,
        email: 'anna@example.com',
        display_name: 'Anna',
        role: 'member',
        created_at: '',
      },
    })
    const user = userEvent.setup()
    render(LoginView)
    await fillAndSubmit(user)

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
      email: 'anna@example.com',
      password: 'hemligt123',
    })
    expect(getToken()).toBe('jwt-fran-api')
    expect(useAuthStore().user?.display_name).toBe('Anna')
    expect(localStorage.length).toBe(0)
    expect(push).toHaveBeenCalledWith('/turer/1/bild')
  })
})
