import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import GuideDetail from './GuideDetail.vue'
import { gql } from '../graphql'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { slug: 'kebnekaise' } }),
}))

vi.mock('../graphql', () => ({
  gql: vi.fn(),
}))

const mockedGql = vi.mocked(gql)

const kebnekaise = {
  id: '1',
  slug: 'kebnekaise',
  title: 'Kebnekaise',
  region: 'Lappland',
  difficulty: 'svår',
  lengthKm: 18,
  bodyHtml: '<p>Sveriges tak</p>',
}

describe('GuideDetail', () => {
  beforeEach(() => {
    mockedGql.mockResolvedValue({ guide: kebnekaise })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('hämtar guiden som slugen i URL:en pekar på', () => {
    render(GuideDetail)
    expect(mockedGql).toHaveBeenCalledWith(
      expect.stringContaining('GetGuide'),
      { slug: 'kebnekaise' },
    )
  })

  it('visar guidens titel och innehåll', async () => {
    render(GuideDetail)
    expect(await screen.findByRole('heading', { name: 'Kebnekaise' })).toBeInTheDocument()
    expect(screen.getByText(/Lappland/)).toBeInTheDocument()
    expect(screen.getByText('Sveriges tak')).toBeInTheDocument()
  })

  it('visar ett fel när anropet misslyckas', async () => {
    mockedGql.mockRejectedValueOnce(new Error('Kunde inte hämta guide'))
    render(GuideDetail)
    expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte hämta guide')
  })
})
