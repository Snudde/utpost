import { createRouter, createWebHistory } from 'vue-router'
import GuidesView from '../views/GuidesView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/guider', name: 'guides', component: GuidesView },
    {
      path: '/guider/:slug',
      name: 'guide',
      component: () => import('../views/GuideDetailView.vue'),
    },
    { path: '/turer', name: 'tours', component: () => import('../views/ToursView.vue') },
    {
      path: '/turer/:id',
      name: 'tour',
      component: () => import('../views/ToursDetailView.vue'),
    },
    {
      path: '/turer/:id/bild',
      name: 'upload',
      component: () => import('../views/PhotoUploadView.vue'),
      meta: { requiresAuth: true }, // M8: skyddad route – se guarden nedan
    },
    { path: '/logga-in', name: 'login', component: () => import('../views/LoginView.vue') },
    {
      path: '/profil',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }, // utloggad → inloggningen, och sedan tillbaka hit
    },
  ],
})

// M8: route guard. Det här är UX – utloggade slipper se en vy som ändå inte fungerar – inte
// säkerhet. Skyddet är API:ets 401: den som kringgår guarden får ändå ingen data.
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isLoggedIn) {
    return { name: 'login', query: { till: to.fullPath } }
  }
})

export default router
