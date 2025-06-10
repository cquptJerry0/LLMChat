import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import ChatView from '@/views/ChatView.vue'
import TestView from '@/views/TestView.vue'
import MainPage from '@/views/MainPage/MainPage.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/chat',
      name: 'chat',
      component: MainPage,
    },
    {
      path: '/test',
      name: 'test',
      component: TestView,
    },

  ],
})

export default router
