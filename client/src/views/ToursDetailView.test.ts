import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ToursDetailView from './ToursDetailView.vue'
import { fetchTour, readImageDimensions, uploadTourPhoto } from '@/lib/photos'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
}))

vi.mock('@/lib/photos', () => ({
  fetchTour: vi.fn(),
  readImageDimensions: vi.fn(),
  uploadTourPhoto: vi.fn(),
}))

const mockTour = {
  id: 7,
  user_id: 1,
  guide_id: null,
  title: 'Fjälltur',
  started_at: '2026-10-01T08:00:00.000Z',
  distance_m: 12400,
  notes: 'Fin utsikt.',
  logs: [
    {
      id: 1,
      tour_id: 7,
      recorded_at: '2026-10-01T08:05:00.000Z',
      lat: 63.1,
      lon: 14.2,
      elevation_m: 500,
      heart_rate: 120,
      note: null,
    },
  ],
  photos: [],
}

describe('ToursDetailView', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('låter användaren välja en bild och visar varianter, tid och kallstart', async () => {
    vi.mocked(fetchTour).mockResolvedValue(mockTour)
    vi.mocked(readImageDimensions).mockResolvedValue({ width: 4000, height: 3000 })
    vi.mocked(uploadTourPhoto)
      .mockResolvedValueOnce({
        id: 101,
        tour_id: 7,
        filename: 'fjall.jpg',
        width: 4000,
        height: 3000,
        created_at: '2026-11-10T10:00:00.000Z',
        variants: [
          { size: 1600, signature: '70872261' },
          { size: 800, signature: '791333b' },
          { size: 400, signature: '7e391172' },
          { size: 160, signature: '7e534ce' },
        ],
        processingMs: 91,
        coldStart: true,
        instance: '1--abc',
        apiMs: 140,
      })
      .mockResolvedValueOnce({
        id: 102,
        tour_id: 7,
        filename: 'fjall.jpg',
        width: 4000,
        height: 3000,
        created_at: '2026-11-10T10:01:00.000Z',
        variants: [
          { size: 1600, signature: '70872261' },
          { size: 800, signature: '791333b' },
          { size: 400, signature: '7e391172' },
          { size: 160, signature: '7e534ce' },
        ],
        processingMs: 65,
        coldStart: false,
        instance: '1--abc',
        apiMs: 110,
      })

    render(ToursDetailView)
    await screen.findByRole('heading', { name: 'Fjälltur' })

    const user = userEvent.setup()
    const input = screen.getByLabelText('Välj bild att ladda upp')
    const file = new File(['pixels'], 'fjall.jpg', { type: 'image/jpeg' })

    await user.upload(input, file)

    await waitFor(() => {
      expect(uploadTourPhoto).toHaveBeenCalledWith({
        tourId: 7,
        filename: 'fjall.jpg',
        width: 4000,
        height: 3000,
      })
    })

    const resultSection = await screen.findByLabelText('Uppladdningsresultat')
    expect(resultSection).toHaveTextContent('91 ms i funktion')
    expect(resultSection).toHaveTextContent('140 ms totalt via API')
    expect(resultSection).toHaveTextContent('Ja')
    expect(resultSection).toHaveTextContent('1600 px')
    expect(resultSection).toHaveTextContent('70872261')
    expect(resultSection).toHaveTextContent('160 px')
    expect(screen.getByText('Bilder (1)')).toBeInTheDocument()

    // Andra uppladdningen visar varm instans (coldStart: false)
    await user.upload(input, file)
    await waitFor(() => {
      expect(resultSection).toHaveTextContent('Nej (varm instans)')
      expect(resultSection).toHaveTextContent('65 ms i funktion')
    })
  })

  it('visar felmeddelande om uppladdningen misslyckas', async () => {
    vi.mocked(fetchTour).mockResolvedValue(mockTour)
    vi.mocked(readImageDimensions).mockResolvedValue({ width: 800, height: 600 })
    vi.mocked(uploadTourPhoto).mockRejectedValue(new Error('Bildfunktionen svarade 502'))

    render(ToursDetailView)
    await screen.findByRole('heading', { name: 'Fjälltur' })

    const user = userEvent.setup()
    const input = screen.getByLabelText('Välj bild att ladda upp')
    const file = new File(['pixels'], 'trasig.jpg', { type: 'image/jpeg' })

    await user.upload(input, file)

    expect(await screen.findByRole('alert')).toHaveTextContent('Bildfunktionen svarade 502')
  })
})
