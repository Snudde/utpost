import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import GuidesView from './GuidesView.vue'
import { gql } from '../graphql'

vi.mock('../graphql', () => ({
  gql: vi.fn(),
}))

const mockedGql = vi.mocked(gql)

const guide = (overrides = {}) => ({
  id: 1,
  slug: 'kebnekaise',
  title: 'Kebnekaise',
  region: 'Lappland',
  difficulty: 'svår',
  lengthKm: 18,
  bodyHtml: '<p>Sveriges tak</p>',
  heroImage: null,
  published: true,
  ...overrides,
})

const renderView = () =>
  render(GuidesView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('GuidesView', () => {
  beforeEach(() => {
    mockedGql.mockResolvedValue({
      guides: [
        guide({ id: 1, title: 'Kebnekaise', region: 'Lappland' }),
        guide({ id: 2, slug: 'sodra-myrleden', title: 'Södra Myrleden', region: 'Småland' }),
      ],
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('visar guiderna från API:et', async () => {
    renderView()
    expect(await screen.findByText('Kebnekaise')).toBeInTheDocument()
    expect(screen.getByText('2 av 2')).toBeInTheDocument()
    expect(mockedGql).toHaveBeenCalledTimes(1)
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
    mockedGql.mockRejectedValueOnce(new Error('Kunde inte nå GraphQL'))
    renderView()
    expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte nå GraphQL')
  })

  it('säger till när inget matchar', async () => {
    const user = userEvent.setup()
    mockedGql.mockResolvedValueOnce({
      guides: [guide({ title: 'Fjällvandring i Sarek', region: 'Norrland' })],
    })

    renderView()

    const searchInput = await screen.findByLabelText('Sök')
    await user.type(searchInput, 'Uppland')

    expect(await screen.findByText('Inga guider hittades.')).toBeInTheDocument()
  })
})
