<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@urql/vue'
import { graphql } from '../gql'
import NoticeList from './NoticeList.vue'
import RichText from './RichText.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

const GUIDE_QUERY = graphql(`
  query GetGuide($slug: String!) {
    guide(slug: $slug) {
      id
      title
      region
      difficulty
      lengthKm
      body {
        runs {
          text
          bold
          italic
          href
        }
      }
      notices {
        id
        title
        level
        status
        body {
          runs {
            text
            bold
            italic
            href
          }
        }
      }
    }
  }
`)

const { data, fetching, error } = useQuery({
  query: GUIDE_QUERY,
  variables: computed(() => ({ slug: slug.value })),
  pause: computed(() => !slug.value),
})

const guide = computed(() => data.value?.guide)
</script>

<template>
  <p v-if="fetching">Laddar...</p>
  <p v-else-if="error" role="alert">Något gick fel: {{ error.message }}</p>
  <p v-else-if="!guide">Guiden hittades inte.</p>
  <article v-else class="guide">
    <h1>{{ guide.title }}</h1>
    <p class="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.lengthKm }} km</p>
    <NoticeList :notices="guide.notices" />
    <RichText :paragraphs="guide.body" />
  </article>
</template>
