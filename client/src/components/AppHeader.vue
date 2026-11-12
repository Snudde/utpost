<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const sessionStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Den som loggar ut på en skyddad sida (/profil, /turer/:id/bild) ska inte bli kvar där –
// guarden körs bara vid navigering. Övriga sidor går lika bra att läsa utloggad.
const logout = () => {
  sessionStore.logout()
  if (route.meta.requiresAuth) router.push('/')
}
</script>
<template>
  <header>
    <nav>
      <div>
        <RouterLink to="/">Hem</RouterLink>
        <RouterLink to="/guider">Guider</RouterLink>
        <RouterLink to="/turer">Turer</RouterLink>
      </div>
      <div class="login-area">
        <template v-if="sessionStore.isLoggedIn">
          <RouterLink to="/profil" class="user-info">{{
            sessionStore.user?.display_name
          }}</RouterLink>
          <button type="button" class="logout-btn" @click="logout">Logga ut</button>
        </template>
        <RouterLink v-else to="/logga-in">Logga in</RouterLink>
      </div>
    </nav>
  </header>
</template>
<style scoped>
header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-background);
  width: 100%;
  display: flex;
  justify-content: space-evenly;
}

nav {
  display: flex;
  justify-content: space-around;
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

.login-area {
  display: flex;
}

.logout-btn {
  background: none;
  font-size: 12px;
  border: none;
  color: #ebebeba3;
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
  cursor: pointer;
}

.logout-btn:hover {
  text-decoration: underline;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
  }

  nav {
    font-size: 1rem;
    padding: 1rem 0;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .logout-btn {
    font-size: 1rem;
  }
}
</style>
