<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { get } from '@/api'

const route = useRoute()
const tour = ref(null)
const error = ref(null)

watch(
  () => route.params.id,
  async (id) => {
    tour.value = null
    error.value = null
    try {
      tour.value = await get(`/tours/${id}`)
    } catch (err) {
      console.error('Kunde inte hämta turen:', err)
      error.value = 'Kunde inte hämta turen.'
    }
  },
  { immediate: true },
)

const climb = computed(() => {
  if (!tour.value) return 0
  const logs = tour.value.logs
  return logs.reduce((sum, log, i) => {
    if (i === 0) return 0
    const diff = log.elevation_m - logs[i - 1].elevation_m
    return diff > 0 ? sum + diff : sum
  }, 0)
})
</script>

<template>
  <p v-if="error">{{ error }}</p>
  <p v-else-if="!tour">Laddar...</p>
  <div v-else>
    <h1>{{ tour.title }}</h1>
    <p class="muted">
      {{ Math.round(tour.distance_m / 100) / 10 }} km · {{ tour.logs.length }} mätpunkter ·
      {{ climb }} höjdmeter
    </p>
    <p v-if="tour.notes">{{ tour.notes }}</p>
    <h2>Mätpunkter</h2>
    <ol class="logs">
      <li v-for="log in tour.logs" :key="log.id">
        {{ new Date(log.recorded_at).toLocaleTimeString('sv-SE') }} · {{ log.elevation_m }} m ·
        {{ log.heart_rate }} slag/min
      </li>
    </ol>
  </div>
</template>
