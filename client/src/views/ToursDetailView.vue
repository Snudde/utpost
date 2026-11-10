<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchTour, readImageDimensions, uploadTourPhoto } from '@/lib/photos'
import { elevationGain } from '@/lib/tours'

const route = useRoute()
const tour = ref(null)
const error = ref(null)
const uploading = ref(false)
const uploadError = ref(null)
const uploadResult = ref(null)

watch(
  () => route.params.id,
  async (id) => {
    tour.value = null
    error.value = null
    uploadError.value = null
    uploadResult.value = null
    try {
      tour.value = await fetchTour(String(id))
    } catch (err) {
      console.error('Kunde inte hämta turen:', err)
      error.value = 'Kunde inte hämta turen.'
    }
  },
  { immediate: true },
)

const climb = computed(() => (tour.value ? elevationGain(tour.value.logs) : 0))

const handleFileChange = async (event) => {
  const input = event.target
  const file = input?.files?.[0]
  if (!file || !tour.value) return

  uploading.value = true
  uploadError.value = null
  try {
    const { width, height } = await readImageDimensions(file)
    const uploaded = await uploadTourPhoto({
      tourId: tour.value.id,
      filename: file.name,
      width,
      height,
    })
    uploadResult.value = uploaded
    tour.value = {
      ...tour.value,
      photos: [...(tour.value.photos ?? []), uploaded],
    }
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Kunde inte ladda upp bilden.'
  } finally {
    uploading.value = false
    if (input) input.value = ''
  }
}
</script>

<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!tour">Laddar...</p>
  <div v-else>
    <h1>{{ tour.title }}</h1>
    <p class="muted">
      {{ Math.round(tour.distance_m / 100) / 10 }} km · {{ tour.logs.length }} mätpunkter ·
      {{ climb }} höjdmeter
    </p>
    <p v-if="tour.notes">{{ tour.notes }}</p>

    <section class="photos-section">
      <h2>Bilder ({{ tour.photos?.length ?? 0 }})</h2>

      <div class="upload-box">
        <label for="photo-upload">Välj bild att ladda upp</label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          :disabled="uploading"
          @change="handleFileChange"
        />
        <p v-if="uploading" role="status">Bearbetar bild...</p>
        <p v-if="uploadError" class="error" role="alert">{{ uploadError }}</p>
      </div>

      <section v-if="uploadResult" class="upload-result" aria-label="Uppladdningsresultat">
        <h3>
          Senaste uppladdning: {{ uploadResult.filename }} ({{ uploadResult.width }}×{{
            uploadResult.height
          }})
        </h3>
        <p>
          <strong>Tid:</strong>
          {{ uploadResult.processingMs }} ms i funktion · {{ uploadResult.apiMs }} ms totalt via API
        </p>
        <p>
          <strong>Kallstart:</strong>
          {{ uploadResult.coldStart ? 'Ja' : 'Nej (varm instans)' }}
          <span v-if="uploadResult.instance" class="muted">
            · instans {{ uploadResult.instance }}
          </span>
        </p>
        <p>
          <strong>Varianter ({{ uploadResult.variants.length }}):</strong>
        </p>
        <ul>
          <li v-for="v in uploadResult.variants" :key="v.size">
            {{ v.size }} px · signatur <code>{{ v.signature }}</code>
          </li>
        </ul>
      </section>

      <ul v-if="tour.photos?.length" class="list">
        <li v-for="photo in tour.photos" :key="photo.id">
          {{ photo.filename }} ({{ photo.width }}×{{ photo.height }})
        </li>
      </ul>
      <p v-else class="muted">Inga bilder uppladdade än.</p>
    </section>

    <h2>Mätpunkter</h2>
    <ol class="logs">
      <li v-for="log in tour.logs" :key="log.id">
        {{ new Date(log.recorded_at).toLocaleTimeString('sv-SE') }} · {{ log.elevation_m }} m ·
        {{ log.heart_rate }} slag/min
      </li>
    </ol>
  </div>
</template>

<style scoped>
.photos-section {
  margin: 24px 0;
}
.upload-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background-soft);
}
.upload-box label {
  font-weight: 600;
}
.upload-result {
  margin: 12px 0;
  padding: 14px;
  border: 1px solid hsla(160, 100%, 37%, 0.5);
  border-radius: 6px;
  background: var(--color-background-soft);
}
.upload-result h3 {
  margin-bottom: 6px;
  font-weight: 600;
}
.error {
  color: #b3261e;
}
.muted {
  opacity: 0.75;
  font-size: 14px;
}
.list {
  padding-left: 18px;
  margin-top: 8px;
}
</style>
