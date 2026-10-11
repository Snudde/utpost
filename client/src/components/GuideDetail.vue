<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const guide = ref(null)

watch(
  () => route.params.slug,
  (slug) => {
    guide.value = null
    fetch(`http://localhost:4000/api/guides/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        guide.value = data
      })
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="!guide">Laddar...</p>
  <article v-else class="guide">
    <h1>{{ guide.title }}</h1>
    <p class="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km</p>
    <div v-html="guide.body_html" />
  </article>
</template>
