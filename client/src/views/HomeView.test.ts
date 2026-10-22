import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import HomeView from './HomeView.vue'
import { mockGraphql, urqlPlugin } from '../test-urql'

const renderView = () =>
  render(HomeView, {
    global: {
      plugins: [urqlPlugin()],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })

describe('HomeView', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('visar startsidan från ett enda GraphQL-anrop', async () => {
    mockGraphql({
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

    expect(await screen.findByText('1 guider i 2 landskap.')).toBeInTheDocument()
    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('visar felet när GraphQL svarar med errors', async () => {
    mockGraphql({ errors: [{ message: 'Cannot query field "titel" on type "Guide".' }] })
    renderView()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot query field')
  })
})
