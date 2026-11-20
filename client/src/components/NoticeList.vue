<script setup lang="ts">
import type { Notice } from '../lib/notices'
import RichText from './RichText.vue'

// M9: redaktionens notiser. Innehållet kommer ur CMS:et via vårt eget GraphQL-API – komponenten
// vet inte det, och behöver inte veta det. level säger vad notisen ÄR (info eller varning);
// att en varning är gul bestäms här, i klienten.
defineProps<{ notices: Notice[] }>()

// Det förhandsgranskningen visar utöver det publicerade (bara för redaktionen).
const STATUS: Record<string, string> = { draft: 'Utkast', changed: 'Ändrad, inte publicerad' }
</script>

<template>
  <section v-if="notices.length" class="notices" aria-label="Notiser från redaktionen">
    <article v-for="notice in notices" :key="notice.id" class="notice" :class="notice.level">
      <h3>
        {{ notice.title }}
        <span v-if="STATUS[notice.status]" class="status">{{ STATUS[notice.status] }}</span>
      </h3>
      <RichText :paragraphs="notice.body" />
      <p v-if="notice.guideSlug" class="muted">
        Gäller <RouterLink :to="`/guider/${notice.guideSlug}`">den här guiden</RouterLink>
      </p>
    </article>
  </section>
</template>

<style scoped>
.notice {
  border-left: 4px solid #2b6cb0;
  background: #eef5fb;
  padding: 8px 14px;
  margin: 12px 0;
  max-width: 70ch;
}
.notice.varning {
  border-color: #b7791f;
  background: #fdf6e3;
}
.notice h3 {
  margin: 4px 0;
  font-size: 16px;
}
.notice :deep(p) {
  margin: 4px 0;
}
.status {
  margin-left: 8px;
  padding: 1px 8px;
  border: 1px solid #777;
  border-radius: 10px;
  font-size: 12px;
  font-weight: normal;
}
.muted {
  color: #777;
  font-size: 14px;
}
</style>
