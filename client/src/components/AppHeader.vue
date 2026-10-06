<script setup>
import { RouterLink } from 'vue-router'
</script>
<template>
  <header>
    <nav>
      <RouterLink to="/">Hem</RouterLink>
      <RouterLink to="/guider">Guider</RouterLink>
      <RouterLink to="/turer">Turer</RouterLink>
      <RouterLink to="/login">Login</RouterLink>
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
}
</style>
