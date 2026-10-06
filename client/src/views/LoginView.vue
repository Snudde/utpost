<script setup lang="ts">
import SignIn from '@/components/SignIn.vue'
</script>

<template>
  <main class="login-view">
    <SignIn />
    <SignUp />
  </main>
</template>

<style scoped>
.login-view {
  padding: 40px 20px;
  display: flex;
  justify-content: center;
}
</style>