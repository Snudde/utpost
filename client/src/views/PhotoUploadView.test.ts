import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import type { Photo, PhotoUploadResponse, TourDetail } from '@utpost/shared'
import PhotoUploadView from './PhotoUploadView.vue'
import { get, post } from '../api.js'

// Som i de andra vyerna: vi mockar vår egen API-modul, inte fetch.
vi.mock('../api', () => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '1' } }) }))

// RouterLink finns inte utan en router – en stub som renderar en vanlig länk räcker.
const renderView = () =>
  render(PhotoUploadView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

const tour: TourDetail = {
  id: 1,
  user_id: 1,
  guide_id: null,
  title: 'Morgontur',
  started_at: '2026-09-01T06:00:00.000Z',
  distance_m: 12345,
  notes: null,
  logs: [],
  photos: [],
}
const photo: Photo = {
  id: 7,
  tour_id: 1,
  filename: 'fjall.jpg',
  width: 4000,
  height: 3000,
  created_at: '2026-11-04T12:00:00.000Z',
}
const svar: PhotoUploadResponse = {
  ...photo,
  variants: [
    { size: 1600, signature: '70872261' },
    { size: 800, signature: '791333b' },
    { size: 400, signature: '7e391172' },
    { size: 160, signature: '7e534ce' },
  ],
  processingMs: 103,
  coldStart: true,
  instance: 'lokal',
  apiMs: 131,
}

describe('PhotoUploadView – uppladdningen (M7, skyddad route i M8)', () => {
  let photos: Photo[]

  beforeEach(() => {
    photos = []
    mockedGet.mockImplementation(async (path: string) =>
      path.startsWith('/photos/tour/') ? photos : tour,
    )
    // jsdom avkodar inga bilder – createImageBitmap finns inte där, så vi ger den måtten direkt.
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 3000, close: () => {} })),
    )
  })

  it('skickar mått och filnamn och visar varianterna, tiderna och kallstarten', async () => {
    mockedPost.mockImplementation(async () => {
      photos = [photo]
      return svar
    })
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Ladda upp en bild till Morgontur')

    const file = new File(['bytes'], 'fjall.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Ladda upp en bild'), file)

    expect(mockedPost).toHaveBeenCalledWith('/photos', {
      tourId: 1,
      filename: 'fjall.jpg',
      width: 4000,
      height: 3000,
    })
    const result = await screen.findByTestId('upload-result')
    expect(within(result).getByText('kallstart')).toBeInTheDocument()
    expect(result).toHaveTextContent('bildarbetet 103 ms · hela anropet 131 ms')
    expect(within(result).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Turen har 1 bilder.')).toBeInTheDocument()
  })

  it('visar felet när bildtjänsten inte svarar', async () => {
    mockedPost.mockResolvedValue({ error: 'bildtjänsten svarar inte' })
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Ladda upp en bild till Morgontur')

    await user.upload(
      screen.getByLabelText('Ladda upp en bild'),
      new File(['bytes'], 'fjall.jpg', { type: 'image/jpeg' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('bildtjänsten svarar inte')
  })
})
