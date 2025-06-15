import { createRouter, createWebHistory } from 'vue-router'
import { useNormalizedChatStore } from '@/stores/normalizedChat'

// 使用路由懒加载
const HomePage = () => import('@/views/HomePage.vue')
const TestView = () => import('@/views/TestView.vue')
const MainPage = () => import('@/views/MainPage/MainPage.vue')

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
      redirect: { name: 'conversation', params: { conversationId: 'default' } }
    },
    {
      path: '/chat/:conversationId',
      name: 'conversation',
      component: MainPage,
      props: true
    },
    {
      path: '/test',
      name: 'test',
      component: TestView,
    },
  ],
})

// 全局导航守卫
router.beforeEach((to, from, next) => {
  // 处理默认的conversationId
  if (to.name === 'conversation' && to.params.conversationId === 'default') {
    // 创建新对话
    const chatStore = useNormalizedChatStore()
    const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    chatStore.addConversation({ id: newId, title: '新的对话' })

    next({ name: 'conversation', params: { conversationId: newId }, replace: true })
    return
  }
  next()
})

export default router
