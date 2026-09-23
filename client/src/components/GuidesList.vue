<script setup>
import { ref, onMounted, computed } from 'vue'
import GuideCard from './GuideCard.vue'

const guides = ref([])
const query = ref('')
const isLoading = ref(true)
const error = ref(null)

onMounted(() => {
  fetch('http://localhost:4000/api/guides')
    .then((r) => {
      if (!r.ok) throw new Error(`Kunde inte hämta guider (status ${r.status})`)
      return r.json()
    })
    .then((data) => {
      guides.value = data
    })
    .catch((err) => {
      error.value = err.message
    })
    .finally(() => {
      isLoading.value = false
    })
})

const filteredGuides = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return guides.value
  return guides.value.filter(
    (g) => g.title.toLowerCase().includes(q) || g.region.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="greetings">
    <h1 class="green">Guides</h1>

    <p v-if="isLoading">Laddar guider…</p>
    <p v-else-if="error" class="error">Något gick fel: {{ error }}</p>
    <template v-else>
      <div class="searchrow">
        <input v-model="query" placeholder="Sök på namn eller landskap" />
      </div>
      <p class="hit-count">{{ filteredGuides.length }} av {{ guides.length }}</p>
      <p v-if="filteredGuides.length === 0">Inga guider hittades.</p>
      <div v-else class="grid">
        <GuideCard v-for="g in filteredGuides" :key="g.id" :guide="g" />
      </div>
    </template>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
