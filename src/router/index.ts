import { createRouter, createWebHistory } from 'vue-router'
import { useNormalizedChatStore } from '@/stores/normalizedChat'

const MainPage = () => import('@/views/MainPage/MainPage.vue')
const Welcome = () => import('@/views/MainPage/components/Welcome/Welcome.vue')
const MainWindow = () => import('@/views/MainPage/layout/MainWindow.vue')

const router_ = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'conversation', params: { conversationId: 'default' } }
    },
    {
      path: '/chat',
      name: 'welcome',
      component: MainPage,
      meta: { title: '承接组件' }
    },
    {
      path: '/chat/:conversationId',
      name: 'conversation',
      component: MainPage,
      props: true,
      meta: { title: '会话组件' }
    },
  ],
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/chat'
    },
    {
      path: '/chat',
      component: MainPage,
      children: [
        {
          path: '',  // 空路径匹配 /chat
          name: 'welcome',
          component: Welcome,
          meta: { title: '开始对话' }
        },
        {
          path: ':conversationId',  // 匹配 /chat/:conversationId
          name: 'conversation',
          component: MainWindow,
          props: true,
          meta: { title: '对话' }
        }
      ]
    }
  ]
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
