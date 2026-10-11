<script setup lang="ts">
import { ref } from 'vue'
import SignIn from '@/components/SignIn.vue'
import SignUp from '@/components/SignUp.vue'

const isSignUp = ref(false)
</script>
<template>
  <main class="login-view">
    <div class="container">
      <SignUp v-if="isSignUp" />
      <SignIn v-else />

      <p class="toggle-text">
        <span v-if="isSignUp">
          <button type="button" class="link-btn" @click="isSignUp = false">Logga in här</button>
        </span>
        <span v-else>
          Har du inget konto?
          <button type="button" class="link-btn" @click="isSignUp = true">Skapa konto här</button>
        </span>
      </p>
    </div>
  </main>
</template>
<style scoped>
.login-view {
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  color: #ebebeba3;
}
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.toggle-text {
  margin-top: 16px;
  font-size: 14px;
}
.link-btn {
  background: none;
  border: none;
  color: #2f6b4f;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin-left: 4px;
}
</style>
