import type { TourDetail, UploadPhotoRequest, UploadPhotoResponse } from '@utpost/shared'
import { get, post } from '@/api'

export const fetchTour = (id: string): Promise<TourDetail> => get<TourDetail>(`/tours/${id}`)

export const uploadTourPhoto = (payload: UploadPhotoRequest): Promise<UploadPhotoResponse> =>
  post<UploadPhotoResponse>('/photos', payload)

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
