import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import type { Guide } from '@utpost/shared'
import GuidesView from './GuidesView.vue'

// Kontraktet styr mockdatan: glömmer ni ett fält säger typecheck ifrån.
const guide = (overrides: Partial<Guide>): Guide => ({
  id: 1,
  slug: 'kebnekaise',
  title: 'Kebnekaise',
  region: 'Lappland',
  difficulty: 'svår',
  length_km: 18,
  body_html: '<p>Sveriges tak</p>',
  hero_image: null,
  published: true,
  author_id: 1,
  updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
})

const renderView = () =>
  render(GuidesView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('GuidesView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            guide({ id: 1, title: 'Kebnekaise', region: 'Lappland' }),
            guide({ id: 2, slug: 'sodra-myrleden', title: 'Södra Myrleden', region: 'Småland' }),
          ]),
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('visar guiderna från API:et', async () => {
    renderView()
    expect(await screen.findByText('Kebnekaise')).toBeInTheDocument()
    expect(screen.getByText('2 av 2')).toBeInTheDocument()
  })

  it('filtrerar på landskap när användaren söker', async () => {
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Kebnekaise')

    await user.type(screen.getByLabelText('Sök'), 'små')

    expect(screen.getByText('Södra Myrleden')).toBeInTheDocument()
    expect(screen.queryByText('Kebnekaise')).not.toBeInTheDocument()
    expect(screen.getByText('1 av 2')).toBeInTheDocument()
  })

  it('visar ett fel när API:et inte svarar', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API svarade 500'))
    renderView()
    expect(await screen.findByRole('alert')).toHaveTextContent('API svarade 500')
  })

  it('säger till när inget matchar', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          guide({ title: 'Fjällvandring i Sarek', region: 'Norrland' }),
        ]),
    } as Response)

    renderView()

    const searchInput = await screen.findByLabelText('Sök')
    await user.type(searchInput, 'Uppland')

    expect(await screen.findByText('Inga guider hittades.')).toBeInTheDocument()
  })
})
