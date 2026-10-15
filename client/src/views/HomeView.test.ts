import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import HomeView from './HomeView.vue'
import { gql } from '../graphql'

// Samma mönster som GuidesView.test.ts: vi mockar vår egen modul, inte fetch.
vi.mock('../graphql', () => ({ gql: vi.fn() }))
const mockedGql = vi.mocked(gql)

const renderView = () =>
  render(HomeView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('HomeView', () => {
  it('visar startsidan från ett enda GraphQL-anrop', async () => {
    mockedGql.mockResolvedValue({
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
    })
    renderView()

    expect(await screen.findByText('1 guider i 2 landskap.')).toBeInTheDocument()
    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(mockedGql).toHaveBeenCalledTimes(1)
  })

  it('visar felet när GraphQL svarar med errors', async () => {
    mockedGql.mockRejectedValue(new Error('Cannot query field "titel" on type "Guide".'))
    renderView()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot query field')
  })
})
