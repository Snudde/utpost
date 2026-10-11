<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/session'

const router = useRouter()
const sessionStore = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await sessionStore.login({
      email: email.value,
      password: password.value,
    })
    router.push('/')
  } catch (err) {
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Ett oväntat fel inträffade vid inloggning.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form class="login" @submit.prevent="handleSubmit">
    <h1>Logga in</h1>
    <label for="email">E-post</label>
    <input id="email" v-model="email" type="email" placeholder="namn@exempel.se" required />
    <label for="password">Lösenord</label>
    <input id="password" v-model="password" type="password" placeholder="Lösenord" required />
    <p v-if="errorMessage" class="error" role="alert">
      {{ errorMessage }}
    </p>
    <button type="submit" class="button-green" :disabled="isLoading">
      {{ isLoading ? 'Loggar in...' : 'Logga in' }}
    </button>
  </form>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  color: black;
  gap: 10px;
  max-width: 360px;
  margin: 0 auto;
  background: #fff;
  padding: 24px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.login h1 {
  margin-top: 0;
  margin-bottom: 8px;
}
.login label {
  font-size: 14px;
  font-weight: 600;
}
.login input {
  padding: 10px;
  border: 1px solid #c9c4b5;
  border-radius: 3px;
  font-size: 15px;
}
.error {
  color: #b3261e;
  margin: 4px 0;
  font-size: 14px;
}
.button-green {
  margin-top: 8px;
  background: hsla(160, 100%, 37%, 1);
  color: black;
  border: none;
  padding: 9px 16px;
  cursor: pointer;
  border-radius: 3px;
  font-weight: 600;
}
.button-green:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
