<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  guide: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="card">
    <h3>
      <RouterLink :to="`/guider/${guide.slug}`">{{ guide.title }}</RouterLink>
    </h3>
    <p class="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km</p>
    <div class="excerpt" v-html="guide.body_html.slice(0, 180)" />
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 4px;
}
</style>
