<script setup lang="ts">
import { useQuery } from '@urql/vue'
import { RouterLink } from 'vue-router'
import { graphql } from '../gql'

// Turlistan via GraphQL i stället för GET /api/tours. REST-svaret var 282 kB med alla mätpunkter
// och hela användarraden (inklusive password_hash); den här frågan ber bara om fälten tabellen
// visar – ca 7 kB. Mätningen står i docs/decisions/api-stil.md.
const TOURS_QUERY = graphql(`
  query Tours {
    tours(limit: 50) {
      id
      title
      distanceM
      user {
        displayName
      }
      guide {
        title
      }
      photos {
        id
      }
    }
  }
`)

const { data, error } = useQuery({ query: TOURS_QUERY })
</script>

<template>
  <h1 class="green">Turer</h1>
  <p v-if="error" role="alert">Kunde inte hämta turer: {{ error }}</p>
  <p v-else-if="!data">Laddar turer...</p>
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
      <tr v-for="t in data.tours" :key="t.id">
        <td>
          <RouterLink :to="`/turer/${t.id}`">
            {{ t.title }}
          </RouterLink>
        </td>
        <td>{{ t.user.displayName }}</td>
        <td>{{ t.guide?.title ?? '-' }}</td>
        <td>{{ Math.round(t.distanceM / 100) / 10 }} km</td>
        <td>{{ t.photos.length }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}
</style>
