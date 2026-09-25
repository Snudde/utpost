import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/guider',
      name: 'guides',
      component: () => import('../views/GuidesView.vue'),
    },
    {
      path: '/guider/:slug',
      name: 'guide-detail',
      component: () => import('../views/GuideDetailView.vue'),
    },
    {
      path: '/turer',
      name: 'tours',
      component: () => import('../views/ToursView.vue'),
    },
  ],
})

export default router
