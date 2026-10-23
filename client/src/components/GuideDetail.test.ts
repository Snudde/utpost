import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import GuideDetail from './GuideDetail.vue'
import { mockGraphql, urqlPlugin } from '../test-urql'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { slug: 'kebnekaise' } }),
}))

const kebnekaise = {
  id: '1',
  title: 'Kebnekaise',
  region: 'Lappland',
  difficulty: 'svår',
  lengthKm: 18,
  bodyHtml: '<p>Sveriges tak</p>',
}

const renderGuide = () => render(GuideDetail, { global: { plugins: [urqlPlugin()] } })

describe('GuideDetail', () => {
  beforeEach(() => {
    mockGraphql({ data: { guide: kebnekaise } })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('hämtar guiden som slugen i URL:en pekar på', async () => {
    renderGuide()
    // urql skickar anropet asynkront, inte direkt i render
    await vi.waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/graphql',
        expect.objectContaining({ body: expect.stringContaining('"slug":"kebnekaise"') }),
      ),
    )
  })

  it('visar guidens titel och innehåll', async () => {
    renderGuide()
    expect(await screen.findByRole('heading', { name: 'Kebnekaise' })).toBeInTheDocument()
    expect(screen.getByText(/Lappland/)).toBeInTheDocument()
    expect(screen.getByText('Sveriges tak')).toBeInTheDocument()
  })

  it('visar ett fel när anropet misslyckas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Kunde inte hämta guide'))),
    )
    renderGuide()
    expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte hämta guide')
  })
})
