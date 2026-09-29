<script setup>
  import { ref, onMounted } from 'vue'
  import { RouterLink } from 'vue-router';
  import { get } from '@/api'

  const tours = ref([])
  const loading = ref(true)

  onMounted(async () => {
    try {
      const data = await get('/tours')
      tours.value = data
    } catch (error) {
      console.error('Kunde inte hämta turer:', error)
    } finally {
      loading.value = false
    }
  })

</script>

<template>
  <main>
    <h1>Turer</h1>
    <p v-if="loading">Laddar turer...</p>
    <table v-else class="tours">
      <thead>
        <tr class="flex-center">
          <th>Tur</th>
          <th>Av</th>
          <th>Guide</th>
          <th>Längd</th>
          <th>Bilder</th>
        </tr>
      </thead>
      <tbody>
          <tr v-for="t in tours" :key="t.id">
            <td>
              <RouterLink :to="`/turer/${t.id}`">
                  {{ t.title }}
              </RouterLink>
            </td>  
            <td>{{ t.user?.display_name }}</td>
            <td>{{ t.guide?.title ?? '-' }}</td>
            <td>{{Math.round(t.distance_m / 100) / 10}} km</td>
            <td>{{ t.photos?.length ?? 0}}</td>
          </tr>
      </tbody>
    </table>
  </main>
</template>
