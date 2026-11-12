<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type {
  ApiError,
  Photo,
  PhotoUploadRequest,
  PhotoUploadResponse,
  TourDetail,
} from '@utpost/shared'
import { get, post } from '../api'

// M7: uppladdningen. Bara måtten och filnamnet lämnar browsern – bytes skickas inte än
// (Blob Storage är nästa steg). API:et lämnar över bildarbetet till funktionen process-image.
// M8: en egen route (/turer/:id/bild) som kräver inloggning – routern skickar utloggade till
// /logga-in. Men det är API:et som skyddar: POST /api/photos svarar 401 utan token och 403 på
// någon annans tur, oavsett vad routern gör.
const route = useRoute()
const tour = ref<TourDetail | null>(null)
const photos = ref<Photo[]>([])
const upload = ref<PhotoUploadResponse | null>(null)
const uploadError = ref<string | null>(null)
const uploading = ref(false)
const error = ref<string | null>(null)

const loadPhotos = async () => {
  photos.value = await get<Photo[]>(`/photos/tour/${route.params.id}`)
}

onMounted(async () => {
  try {
    tour.value = await get<TourDetail>(`/tours/${route.params.id}`)
    await loadPhotos()
  } catch (err) {
    error.value = (err as Error).message
  }
})

const onFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = null
  upload.value = null
  try {
    // createImageBitmap avkodar bilden i browsern – så får vi bredd och höjd utan att skicka den.
    const bitmap = await createImageBitmap(file)
    const body: PhotoUploadRequest = {
      tourId: Number(route.params.id),
      filename: file.name,
      width: bitmap.width,
      height: bitmap.height,
    }
    bitmap.close()
    const svar = await post<PhotoUploadResponse | ApiError>('/photos', body)
    if ('error' in svar) throw new Error(svar.error)
    upload.value = svar
    await loadPhotos()
  } catch (err) {
    uploadError.value = (err as Error).message
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!tour">Laddar…</p>
  <section v-else class="upload">
    <h1>Ladda upp en bild till {{ tour.title }}</h1>
    <label>
      Ladda upp en bild
      <input type="file" accept="image/*" :disabled="uploading" @change="onFile" />
    </label>
    <p v-if="uploading" class="muted">Skalar om…</p>
    <p v-if="uploadError" role="alert">Uppladdningen misslyckades: {{ uploadError }}</p>
    <div v-if="upload" class="result" data-testid="upload-result">
      <p>
        <strong>{{ upload.filename }}</strong> · {{ upload.width }}×{{ upload.height }} ·
        bildarbetet {{ upload.processingMs }} ms · hela anropet {{ upload.apiMs }} ms
        <span v-if="upload.coldStart" class="cold">kallstart</span>
      </p>
      <ul>
        <li v-for="variant in upload.variants" :key="variant.size">
          {{ variant.size }} px · signatur {{ variant.signature }}
        </li>
      </ul>
      <p class="muted">instans {{ upload.instance }}</p>
    </div>
    <p class="muted">Turen har {{ photos.length }} bilder.</p>
    <RouterLink :to="`/turer/${route.params.id}`">Tillbaka till turen</RouterLink>
  </section>
</template>

<style scoped>
.muted {
  color: #777;
  font-size: 14px;
}
.upload {
  margin: 24px 0;
}
.result {
  border-left: 3px solid #2a7;
  padding-left: 12px;
}
.cold {
  background: #fde68a;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 13px;
}
</style>
