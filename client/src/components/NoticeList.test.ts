import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import NoticeList from './NoticeList.vue'
import type { Notice } from '../lib/notices'

const notice = (extra: Partial<Notice>): Notice => ({
  id: 'n1',
  title: 'Leden är avstängd',
  level: 'varning',
  status: 'published',
  guideSlug: null,
  body: [{ runs: [{ text: 'Bron lagas.', bold: false, italic: false, href: null }] }],
  ...extra,
})

const renderList = (notices: Notice[]) =>
  render(NoticeList, {
    props: { notices },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })

describe('NoticeList', () => {
  it('visar rubrik och text, och nivån som klass – utseendet är klientens sak', () => {
    renderList([notice({})])

    expect(screen.getByRole('heading', { name: 'Leden är avstängd' })).toBeInTheDocument()
    expect(screen.getByText('Bron lagas.')).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveClass('varning')
  })

  it('märker ut det som inte är publicerat (förhandsgranskningen)', () => {
    renderList([
      notice({ id: 'n2', title: 'Ny led i vår', status: 'draft' }),
      notice({ id: 'n3', title: 'Välkommen', status: 'changed' }),
    ])

    expect(screen.getByText('Utkast')).toBeInTheDocument()
    expect(screen.getByText('Ändrad, inte publicerad')).toBeInTheDocument()
  })

  it('utan notiser visas ingenting alls', () => {
    renderList([])
    expect(screen.queryByRole('region')).toBeNull()
  })
})
