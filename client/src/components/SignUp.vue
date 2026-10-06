<script setup lang="ts">
    import { ref } from 'vue'
    import { useRouter } from 'vue-router';
    import { useAuthStore } from '@/stores/session';

    const router = useRouter()
    const sessionStore = useAuthStore()

    const displayName = ref('')
    const email = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const errorMessage = ref<string | null>(null)
    const isLoading = ref(false)


    async function handleSubmit() {
        errorMessage.value = null
        // Enkel validering innan vi anropar servern
        if (password.value !== confirmPassword.value) {
            errorMessage.value = 'Lösenorden matchar inte.'
            return
        }
        isLoading.value = true
        try {
            await sessionStore.register({
            displayName: displayName.value,
            email: email.value,
            password: password.value,
            })
            // Skicka till startsidan när registreringen och inloggningen är klar
            router.push('/')
        } catch (err) {
            if (err instanceof Error) {
            errorMessage.value = err.message
            } else {
            errorMessage.value = 'Ett fel uppstod vid registreringen.'
            }
        } finally {
            isLoading.value = false
        }
}
</script>

<template>
    <form class="login" @submit.prevent="handleSubmit">
        <h1>Skapa konto</h1>
        <label for="name">Namn</label>
        <input
            id="name"
            v-model="displayName"
            type="text"
            placeholder="För- och efternamn"
            required
        />
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
            placeholder="Minst 6 tecken"
            required
        />
        <label for="confirmPassword">Upprepa lösenord</label>
        <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Upprepa lösenord"
            required
        />
        <p v-if="errorMessage" class="error" role="alert">
        {{ errorMessage }}
        </p>
        <button type="submit" class="button-blue" :disabled="isLoading">
        {{ isLoading ? 'Skapar konto...' : 'Registrera dig' }}
        </button>
    </form>
</template>

<style scoped>
    .login {
    display: flex;
    flex-direction: column;
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
    .button-blue {
    margin-top: 8px;
    background: #3d7dff;
    color: #fff;
    border: 1px solid #3d7dff;
    padding: 9px 16px;
    cursor: pointer;
    border-radius: 3px;
    font-weight: 600;
    }
    .button-blue:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    }
</style>