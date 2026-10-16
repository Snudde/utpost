<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gql } from '../graphql'

const route = useRoute()
const guide = ref(null)
const error = ref(null)
const isLoading = ref(true)

const GUIDE_QUERY = /* GraphQL */ `
  query GetGuide($slug: String!) {
    guide(slug: $slug) {
      id
      title
      region
      difficulty
      lengthKm
      bodyHtml
    }
  }
`

watch(
  () => route.params.slug,
  async (slug) => {
    if (!slug) return
    guide.value = null
    error.value = null
    isLoading.value = true

    try {
      const data = await gql(GUIDE_QUERY, { slug })
      guide.value = data.guide
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="isLoading">Laddar...</p>
  <p v-else-if="error" role="alert">Något gick fel: {{ error }}</p>
  <p v-else-if="!guide">Guiden hittades inte.</p>
  <article v-else class="guide">
    <h1>{{ guide.title }}</h1>
    <p class="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.lengthKm }} km</p>
    <div v-html="guide.bodyHtml" />
  </article>
</template>