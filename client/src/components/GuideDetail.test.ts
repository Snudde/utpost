import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import type { Guide } from '@utpost/shared'
import GuideDetail from './GuideDetail.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { slug: 'kebnekaise' } }),
}))

const kebnekaise: Guide = {
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
}

describe('GuideDetail', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(kebnekaise) }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('hämtar guiden som slugen i URL:en pekar på', () => {
    render(GuideDetail)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/guides/kebnekaise'))
  })

  it('visar guidens titel och innehåll', async () => {
    render(GuideDetail)
    expect(await screen.findByRole('heading', { name: 'Kebnekaise' })).toBeInTheDocument()
    expect(screen.getByText(/Lappland/)).toBeInTheDocument()
    expect(screen.getByText('Sveriges tak')).toBeInTheDocument()
  })
})
