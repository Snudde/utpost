<script setup>
import { ref, onMounted, computed } from 'vue'
import { gql } from '../graphql'
import GuideCard from './GuideCard.vue'

const guides = ref([])
const query = ref('')
const isLoading = ref(true)
const error = ref(null)

const GUIDES_QUERY = /* GraphQL */ `
  query GetGuides {
    guides {
      id
      slug
      title
      region
      difficulty
      lengthKm
      bodyHtml
    }
  }
`

onMounted(async () => {
  try {
    const data = await gql(GUIDES_QUERY)
    // Vi mappar fälten så att kortet fungerar oavsett om det läser camelCase eller snake_case
    guides.value = data.guides.map((g) => ({
      ...g,
      length_km: g.lengthKm,
      body_html: g.bodyHtml,
    }))
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
})

// Denna saknades i scriptet:
const filteredGuides = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return guides.value
  return guides.value.filter(
    (g) => g.title.toLowerCase().includes(q) || g.region.toLowerCase().includes(q),
  )
})
</script>

<template>
  <h1 class="green">Guider</h1>

  <p v-if="isLoading">Laddar guider…</p>
  <p v-else-if="error" role="alert" class="error">Något gick fel: {{ error }}</p>
  <template v-else>
    <div class="searchrow">
      <input v-model="query" aria-label="Sök" placeholder="Sök på namn eller landskap" />
    </div>
    <p class="hit-count">{{ filteredGuides.length }} av {{ guides.length }}</p>
    <p v-if="filteredGuides.length === 0">Inga guider hittades.</p>
    <div v-else class="grid">
      <GuideCard v-for="g in filteredGuides" :key="g.id" :guide="g" />
    </div>
  </template>
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
