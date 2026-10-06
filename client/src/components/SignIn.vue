<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const user = ref('')
const password = ref('')
const errorMessage = ref<string | null>(null)
const isLoading = ref(false)

async function handleSubmit() {
    errorMessage.value = null
    isLoading.value = true

    try{
        await sessionStorage.login({
            email: email.value,
            password: password.value,
        })
        router.push('/')
    } catch (err) {
        if(err instanceof Error) {
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
        <input
        id="email"
        v-model="email"
        type="email"
        placeholder="namn@exempel.se"
        required
        />
        <label for="password">Lösenord</label>
        <input
        id="password"
        v-model="password"
        type="password"
        placeholder="Lösenord"
        required
        />
        <p v-if="errorMessage" class="error" role="alert">
        {{ errorMessage }}
        </p>
        <button type="submit" class="button-blue" :disabled="isLoading">
        {{ isLoading ? 'Loggar in...' : 'Logga in' }}
        </button>
  </form>
</template>

<style scoped>

</style>