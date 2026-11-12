import type { ApiError, TourDetail, PhotoUploadRequest, PhotoUploadResponse } from '@utpost/shared'
import { get, post } from '@/api'

export const fetchTour = (id: string): Promise<TourDetail> => get<TourDetail>(`/tours/${id}`)

// post() kastar inte vid 4xx/5xx (M8) – 401, 403, 400 och 502 kommer tillbaka som { error }.
// Vi gör om dem till ett fel här, så att vyn visar texten i stället för att tro att det gick.
export const uploadTourPhoto = async (
  payload: PhotoUploadRequest,
): Promise<PhotoUploadResponse> => {
  const svar = await post<PhotoUploadResponse | ApiError>('/photos', payload)
  if ('error' in svar) throw new Error(svar.error)
  return svar
}

export const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.naturalWidth < 1 || img.naturalHeight < 1) {
        reject(new Error('Bilden saknar giltiga dimensioner.'))
        return
      }
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Kunde inte läsa vald fil som en bild.'))
    }
    img.src = url
  })
