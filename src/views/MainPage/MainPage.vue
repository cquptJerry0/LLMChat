<script setup lang="ts">
import { onMounted, ref, provide, computed, watch, nextTick, onUnmounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useConversationControl } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { useStreamStore } from '@/stores/stream'
import { Monitor, Close } from '@element-plus/icons-vue'
import ChatLayout from './layout/ChatLayout.vue'
import StreamMonitor from '@/components/StreamMonitor.vue'

// 初始化主题
const { currentTheme, setTheme } = useTheme()

// 初始化核心存储
const chatStore = useNormalizedChatStore()
const streamStore = useStreamStore()

// 初始化会话控制
const conversationControl = useConversationControl({
  chatStore: useNormalizedChatStore,
  streamStore: useStreamStore
})

// 提供全局依赖注入，使子组件可以通过 inject 获取
provide('conversationControl', conversationControl)
provide('getStreamControl', conversationControl.messageActions.getStreamControl)

// 获取会话状态
const {
  state: conversationState,
  conversationActions,
  messageActions
} = conversationControl

// 控制 StreamMonitor 的显示状态
const showStreamMonitor = ref(false)
const toggleStreamMonitor = () => {
  showStreamMonitor.value = !showStreamMonitor.value
}

// 全局事件监听 - 网络状态变化
const isOnline = ref(navigator.onLine)
const handleNetworkChange = () => {
  isOnline.value = navigator.onLine
  if (isOnline.value) {
    // 网络恢复时尝试恢复流
    const lastAssistantId = conversationState.value.lastAssistantMessageId
    if (lastAssistantId) {
      const streamControl = messageActions.getStreamControl(lastAssistantId)
      if (streamControl && streamControl.isIncomplete.value) {
        console.log('尝试恢复中断的流...')
      }
    }
  }
}

// 全局事件监听 - 页面可见性变化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // 页面重新可见时刷新状态
    chatStore.initializeFromStorage()

    // 尝试恢复最后一条助手消息
    messageActions.restoreLastAssistant()
  }
}

// 设置全局事件监听
onMounted(() => {
  // 创建默认会话（如果没有活动会话）
  if (!conversationState.value.currentConversationId) {
    conversationActions.create('新的对话')
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

// 监听会话切换
watch(() => conversationState.value.currentConversationId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log(`会话已切换: ${oldId} -> ${newId}`)
    // 这里可以添加会话切换后的处理逻辑
  }
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
    conversationActions.create('新的对话')
  }
}

// 向外部提供方法
defineExpose({
  exportData,
  clearAllData,
  toggleStreamMonitor
})
</script>

<template>
  <div class="main-page">
    <ChatLayout />

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

    <!-- 流状态监控器 -->
    <StreamMonitor v-if="showStreamMonitor" class="stream-monitor" />

    <!-- 监控器切换按钮 -->
    <div class="monitor-toggle" @click="toggleStreamMonitor">
      <el-icon class="monitor-icon">
        <component :is="showStreamMonitor ? Close : Monitor" />
      </el-icon>
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
