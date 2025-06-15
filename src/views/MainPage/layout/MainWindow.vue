<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import ChatHeader from '../components/MainWindow/ChatHeader/ChatHeader.vue'
import MessageList from '../components/MainWindow/MessageList/MessageList.vue'
import ChatInput from '../components/MainWindow/ChatInput/ChatInput.vue'
import { useStreamControl } from '@/composables/useStreamControl_'

// 接收props
const props = defineProps<{
  conversationId?: string
}>()

// 使用父组件提供的会话控制
const { state, conversationActions } = useConversationControlChild()

// 初始化流控制，使用当前的lastAssistantMessageId
const streamControl = useStreamControl(state.value.lastAssistantMessageId || '')

// 监听lastAssistantMessageId的变化，更新流控制的消息ID
watch(
  () => state.value.lastAssistantMessageId,
  (newId) => {
    if (newId) {
      streamControl.setMessageId(newId)
    }
  }
)

// 双击Esc检测
const lastEscTime = ref(0)
const ESC_DOUBLE_CLICK_THRESHOLD = 500 // 毫秒

// 全局键盘事件处理
const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return

  if (event.key === 'Escape') {
    const now = Date.now()

    if (now - lastEscTime.value < ESC_DOUBLE_CLICK_THRESHOLD) {
      // 双击Esc，取消生成（中断请求并完成）
      streamControl.abortStream() // 中断网络请求
      streamControl.completeStream() // 标记为完成
    } else if (streamControl.state.value.isStreaming) {
      // 单击Esc，暂停生成（不中断请求）
      streamControl.pauseStream()
    }

    lastEscTime.value = now
  } else if (event.ctrlKey && event.key === 'r' && streamControl.state.value.isPaused) {
    // Ctrl+R，恢复生成
    event.preventDefault()
    const messageId = streamControl.state.value.messageId
    if (messageId) {
      // 使用简单恢复方法，不重新创建请求
      streamControl.simpleResumeStream()
    }
  }
}

const chatStore = useNormalizedChatStore()

// 组件实例ID，用于调试
const instanceId = ref(`mw_${Date.now().toString(36)}`)

// 获取路由参数
const route = useRoute()
const routeConversationId = computed(() => {
  const id = route.params.conversationId
  return typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'default'
})

// 有效的会话ID (优先使用props)
const effectiveConversationId = computed(() => {
  return props.conversationId || routeConversationId.value
})

// 监听有效会话ID变化
watch(
  effectiveConversationId,
  (newId, oldId) => {
    console.log(`[${instanceId.value}] ConversationId changed: ${oldId} -> ${newId}`)
    if (newId && newId !== state.value.currentConversationId) {
      console.log(`[${instanceId.value}] Switching to conversation: ${newId}`)

      // 检查会话是否存在
      if (chatStore.conversations.has(newId)) {
        conversationActions.switch(newId)
      } else {
        console.warn(`[${instanceId.value}] Conversation ${newId} does not exist!`)
      }
    }
  },
  { immediate: true }
)

// 记录组件生命周期
onMounted(() => {
  console.log(`[${instanceId.value}] MainWindow mounted with conversationId: ${effectiveConversationId.value}`)
  console.log(`[${instanceId.value}] Current state conversationId: ${state.value.currentConversationId}`)

  // 添加全局键盘事件
  document.addEventListener('keydown', handleGlobalKeydown, true)
})

onUnmounted(() => {
  console.log(`[${instanceId.value}] MainWindow unmounted with conversationId: ${effectiveConversationId.value}`)

  // 移除全局键盘事件
  document.removeEventListener('keydown', handleGlobalKeydown, true)
})

// 定义事件
defineEmits(['toggle-sidebar'])
</script>

<template>
  <el-container class="main-window" direction="vertical">
    <!-- 头部 -->
    <ChatHeader @toggle-sidebar="$emit('toggle-sidebar')" />

    <!-- 消息列表 -->
    <el-main class="main-window__content">
      <div class="message-list-wrapper">
        <div class="main-window__content-container">
          <MessageList />
        </div>
      </div>
    </el-main>

    <!-- 输入框 -->
    <el-footer class="main-window__footer" height="auto">
      <div class="main-window__footer-container">
        <ChatInput />
      </div>
    </el-footer>
  </el-container>
</template>

<style lang="scss" scoped>
.main-window {
  height: 100%;
  background-color: #fff;
  &__content {
    flex: 1;
    padding: 0;
    position: relative;
    overflow: hidden; /* 防止主容器出现滚动条 */
  }

  &__content-container {
    max-width: 780px;
    margin: 0 auto;
    width: 100%;
  }

  /* 创建一个内容包装器 */
  .message-list-wrapper {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
      width: 8px;
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      visibility: hidden;
      background-color: #c1c1c1;
      border-radius: 4px;
    }

    &:hover::-webkit-scrollbar-thumb {
      visibility: visible;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: #a8a8a8;
    }
  }

  &__footer-container {
    max-width: 768px;
    height: 100%;
    margin: 0 auto;
    width: 100%;
  }

  &__footer {
    min-height: 180px;
    height: auto;
    background-color: #fff;
    padding: 0;
  }
}

</style>
