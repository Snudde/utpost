<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@urql/vue'
import { graphql } from '../gql'
import { useAuthStore } from '@/stores/session'

// Ersätter web/src/pages/Profile.jsx. React-sidan hämtade GET /api/tours (hela raderna, alla
// mätpunkter) och filtrerade på user_id i webbläsaren. Här ber vi bara om id, titel och ägarens id.
// API:et har ingen fråga för "mina turer" än, så vi filtrerar fortfarande i klienten – bland de
// 200 senaste turerna, det tak som tours(limit) har.
const MY_TOURS_QUERY = graphql(`
  query MyTours {
    tours(limit: 200) {
      id
      title
      user {
        id
      }
    }
  }
`)

const session = useAuthStore()
const router = useRouter()

const { data, error } = useQuery({
  query: MY_TOURS_QUERY,
  pause: computed(() => !session.isAuthenticated),
})

// GraphQL-id:n är strängar, User.id i sessionen är ett tal
const myTours = computed(
  () => data.value?.tours.filter((t) => t.user.id === String(session.user?.id)) ?? [],
)

const logout = () => {
  session.logout()
  router.push('/')
}
</script>

<template>
  <p v-if="!session.isAuthenticated || !session.user">Du är inte inloggad.</p>
  <div v-else>
    <h1>{{ session.user.display_name }}</h1>
    <p class="muted">{{ session.user.email }} · {{ session.user.role }}</p>

    <p v-if="error" role="alert">Kunde inte hämta dina turer: {{ error.message }}</p>
    <p v-else-if="!data">Laddar turer...</p>
    <template v-else>
      <h2>Mina turer ({{ myTours.length }})</h2>
      <ul class="list">
        <li v-for="t in myTours" :key="t.id">
          <RouterLink :to="`/turer/${t.id}`">{{ t.title }}</RouterLink>
        </li>
      </ul>
    </template>

    <button type="button" @click="logout">Logga ut</button>
  </div>
</template>
