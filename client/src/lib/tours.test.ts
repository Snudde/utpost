import { describe, it, expect } from 'vitest'
import type { TourLog } from '@utpost/shared'
import { elevationGain } from './tours'

const log = (elevation_m: number | null, id = 0): TourLog => ({
  id,
  tour_id: 1,
  recorded_at: '2026-09-01T08:00:00.000Z',
  lat: 67.9,
  lon: 18.5,
  elevation_m,
  heart_rate: null,
  note: null,
})

describe('elevationGain', () => {
  it('summerar bara stigningar, inte nedförsbackar', () => {
    expect(elevationGain([log(100), log(150), log(120), log(180)])).toBe(110)
  })
  it('ger 0 för en tur utan mätpunkter', () => {
    expect(elevationGain([])).toBe(0)
  })
  // Regressionstest – skuld ur docs/debt.md: en mätpunkt utan höjd räknas som havsnivå
  it('mätpunkter utan höjd räknas inte som noll', () => {
    expect(elevationGain([log(100), log(null), log(150)])).toBe(50)
  })
  it('räknar inte nedförsbackar som stigning', () => {
    expect(elevationGain([log(100), log(90), log(80)])).toBe(0)
  })
  it('ger 0 för en tur med bara en mätpunkt', () => {
    expect(elevationGain([log(100)])).toBe(0)
  })
  it('hoppar över en första mätpunkt utan höjd', () => {
    expect(elevationGain([log(null), log(100), log(150)])).toBe(50)
  })
})
