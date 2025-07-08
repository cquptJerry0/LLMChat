<script setup lang="ts">
import { onMounted, ref, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConversationControl } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import ChatLayout from './layout/ChatLayout.vue'
import { useComponentsPreload } from '@/composables/useComponentsPreload'

const { startPreload } = useComponentsPreload([

])

startPreload()
// 路由相关
const route = useRoute()
const router = useRouter()

// 初始化核心存储
const chatStore = useNormalizedChatStore()

// 初始化会话控制
const {
  state: conversationState,
  conversationActions,
  messageActions
} = useConversationControl()

// 接收路由参数
const props = defineProps<{
  conversationId?: string
}>()

// 监听路由参数变化
watch(
  () => props.conversationId,
  (newId, oldId) => {
    console.log(`Route param changed: ${oldId} -> ${newId}`)
    if (newId && newId !== conversationState.value.currentConversationId) {
      // 如果对话存在，切换到指定对话
      if (chatStore.conversations.has(newId)) {
        console.log(`Switching to existing conversation: ${newId}`)
        conversationActions.switch(newId)
      } else {
        // 如果对话不存在，创建新对话
        console.log(`Creating new conversation as ${newId} does not exist`)
        const newConversationId = conversationActions.create('新的对话')
        // 更新路由到新创建的对话
        router.replace({
          name: 'conversation',
          params: { conversationId: newConversationId }
        })
      }
    }
  },
  { immediate: true }
)

// 监听当前对话ID变化
watch(
  () => conversationState.value.currentConversationId,
  (newId, oldId) => {
    console.log(`Current conversation changed: ${oldId} -> ${newId}`)
    if (newId && route.params.conversationId !== newId) {
      // 更新路由
      console.log(`Updating route to match current conversation: ${newId}`)
      router.replace({
        name: 'conversation',
        params: { conversationId: newId }
      })
    }
  }
)

// 控制 StreamMonitor 的显示状态
const showStreamMonitor = ref(false)
const toggleStreamMonitor = () => {
  showStreamMonitor.value = !showStreamMonitor.value
}

// 全局事件监听 - 网络状态变化
const isOnline = ref(navigator.onLine)
const handleNetworkChange = () => {
  isOnline.value = navigator.onLine
}

// 全局事件监听 - 页面可见性变化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // 页面重新可见时刷新状态
    messageActions.restoreLastAssistant()
  }
}

// 设置全局事件监听
onMounted(() => {
  // 创建默认会话（如果没有活动会话）
  if (!conversationState.value.currentConversationId) {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}月${currentDate.getDate()}日 ${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
    const defaultTitle = `新对话 - ${formattedDate}`;

    const newConversationId = conversationActions.create(defaultTitle);
    // 更新路由到新创建的对话
    router.replace({
      name: 'conversation',
      params: { conversationId: newConversationId }
    });
  }

  // 监听网络状态变化
  window.addEventListener('online', handleNetworkChange)
  window.addEventListener('offline', handleNetworkChange)

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('online', handleNetworkChange)
  window.removeEventListener('offline', handleNetworkChange)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 导出会话数据方法
const exportData = () => {
  const data = {
    conversations: Object.fromEntries(chatStore.conversations),
    messages: Object.fromEntries(chatStore.messages)
  }

  // 创建下载链接
  const dataStr = JSON.stringify(data, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `llm-chat-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 清理所有会话数据
const clearAllData = () => {
  if (confirm('确定要清除所有会话数据吗？这将删除所有对话历史。')) {
    // 清空存储
    localStorage.clear()
    // 重新初始化
    chatStore.initializeFromStorage()
    // 创建新会话
    const newConversationId = conversationActions.create('新的对话')
    // 更新路由到新创建的对话
    router.replace({
      name: 'conversation',
      params: { conversationId: newConversationId }
    })
  }
}


// 向外部提供方法
defineExpose({
  exportData,
  clearAllData,
  toggleStreamMonitor,
})
</script>

<template>
  <div class="main-page">
    <ChatLayout>
      <template #main-window="{ toggleSidebar }">
        <!-- <MainWindow
          :key="props.conversationId"
          :conversation-id="props.conversationId"
          @toggle-sidebar="toggleSidebar"
        /> -->
        <router-view
          :key="$route.fullPath"
          @toggle-sidebar="toggleSidebar"
        />
      </template>
    </ChatLayout>

    <!-- 网络状态提示 -->
    <div v-if="!isOnline" class="network-status">
      <el-alert
        title="网络连接已断开"
        type="warning"
        description="您当前处于离线状态，部分功能可能无法正常使用。"
        show-icon
        :closable="false"
      />
    </div>

  </div>
</template>

<style lang="scss" scoped>
.main-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #fff;
  color: #000000E6;
  position: relative;

  :deep(.el-aside) {
    background-color: #f5f5f7;
  }

  :deep(.el-main) {
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: #fff;
  }

  :deep(.el-footer) {
    --el-footer-padding: 0;
    height: auto !important;
    background-color: #fff;
  }
}

.network-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
}

.stream-monitor {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.monitor-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }

  .monitor-icon {
    font-size: 20px;
  }
}
</style>
