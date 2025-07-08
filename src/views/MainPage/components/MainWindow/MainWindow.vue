<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { useResizeObserver } from '@vueuse/core'
import ChatHeader from '@/views/MainPage/components/MainWindow/ChatHeader/ChatHeader.vue'
import MessageList from '@/views/MainPage/components/MainWindow/MessageList/MessageList.vue'
import ChatInput from '@/views/MainPage/components/MainWindow/ChatInput/ChatInput.vue'
import { useStreamControl } from '@/composables/useStreamControl'
import ChatIcon from '@/components/ChatIcon.vue'

// 接收props
const props = defineProps<{
  conversationId?: string
}>()

// 使用父组件提供的会话控制
const { state, conversationActions } = useConversationControlChild()

// 初始化流控制，使用当前的lastAssistantMessageId
const streamControl = useStreamControl(state.value.lastAssistantMessageId || '')

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
      streamControl.resumeStream()
    }
  } else if (event.ctrlKey && event.key === 'k') {
    // Ctrl+K，新建会话
    event.preventDefault()
    conversationActions.create('新的对话')
  }
}

// 滚动控制相关
const messageListWrapper = ref<HTMLElement | null>(null)
const isAutoScrollEnabled = ref(true)
const hasNewMessage = ref(false)
const lastSeenMessageId = ref('') // 记录最后看到的消息ID
const showScrollToBottom = ref(false) // 控制滚动到底部按钮显示
const currentStreamingMessageId = ref('') // 记录当前正在流式输出的消息ID
const userScrolledDuringCurrentMessage = ref(false) // 标记用户是否在当前消息生成时手动滚动了

// 检查是否有新消息
const checkNewMessages = () => {
  // 获取当前消息
  const messages = state.value.currentMessages || []
  if (messages.length === 0) return false

  // 检查是否正在生成消息
  const isStreaming = streamControl.state.value.isStreaming

  // 如果正在生成消息且用户不在底部,则显示新消息提示
  if (isStreaming && !isAutoScrollEnabled.value) {
    return true
  }

  // 最后一条消息ID
  const lastMessageId = messages[messages.length - 1]?.id

  // 如果有新消息(ID不同)且用户不在底部,则显示新消息提示
  if (lastMessageId !== lastSeenMessageId.value && !isAutoScrollEnabled.value) {
    return true
  }

  return false
}

// 滚动到底部
const scrollToBottom = (force = false) => {
  if (!messageListWrapper.value) return

  // 如果是强制滚动或自动滚动启用且用户没有在当前消息生成时手动滚动
  if (force || (isAutoScrollEnabled.value && !userScrolledDuringCurrentMessage.value)) {
    nextTick(() => {
      if (messageListWrapper.value) {
        messageListWrapper.value.scrollTop = messageListWrapper.value.scrollHeight

        // 更新最后看到的消息ID
        if (state.value.currentMessages?.length > 0) {
          const lastMessage = state.value.currentMessages[state.value.currentMessages.length - 1]
          if (lastMessage) {
            lastSeenMessageId.value = lastMessage.id
          }
        }

        hasNewMessage.value = false
      }
    })
  } else {
    // 如果用户手动滚动过，显示新消息提示
    if (!force && streamControl.state.value.isStreaming) {
      hasNewMessage.value = true
    }
  }
}

// 监听滚动事件
const handleScroll = () => {
  if (!messageListWrapper.value) return

  const scrollTop = messageListWrapper.value.scrollTop
  const scrollHeight = messageListWrapper.value.scrollHeight
  const clientHeight = messageListWrapper.value.clientHeight

  // 检测是否滚动到底部
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50 // 50px的容差
  isAutoScrollEnabled.value = isAtBottom

  // 如果不在底部，显示滚动到底部按钮
  showScrollToBottom.value = !isAtBottom

  // 如果正在生成消息且用户手动滚动（且不是在底部）
  if (streamControl.state.value.isStreaming &&
      streamControl.state.value.messageId === currentStreamingMessageId.value &&
      !isAtBottom) {
    userScrolledDuringCurrentMessage.value = true
  }
}

// 点击新消息提示
const handleNewMessageClick = () => {
  scrollToBottom(true)
  hasNewMessage.value = false
  // 重置用户滚动标记，让系统恢复自动滚动
  userScrolledDuringCurrentMessage.value = false
}

// 初始化最后看到的消息ID和记录组件生命周期
onMounted(() => {
  console.log(`[${instanceId.value}] MainWindow mounted with conversationId: ${effectiveConversationId.value}`)
  console.log(`[${instanceId.value}] Current state conversationId: ${state.value.currentConversationId}`)

  // 添加全局键盘事件
  document.addEventListener('keydown', handleGlobalKeydown, true)

  // 添加滚动事件监听
  if (messageListWrapper.value) {
    messageListWrapper.value.addEventListener('scroll', handleScroll, { passive: true })
  }

  // 初始化最后看到的消息ID
  if (state.value.currentMessages?.length > 0) {
    const lastMessage = state.value.currentMessages[state.value.currentMessages.length - 1]
    if (lastMessage) {
      lastSeenMessageId.value = lastMessage.id
    }
  }
})

onUnmounted(() => {
  console.log(`[${instanceId.value}] MainWindow unmounted with conversationId: ${effectiveConversationId.value}`)

  // 移除全局键盘事件
  document.removeEventListener('keydown', handleGlobalKeydown, true)

  // 移除滚动事件监听
  if (messageListWrapper.value) {
    messageListWrapper.value.removeEventListener('scroll', handleScroll)
  }

  // 如果有正在进行的流式传输，暂停它
  if (streamControl.state.value.isStreaming) {
    console.log(`[${instanceId.value}] Aborting active stream on unmount`)
    streamControl.pauseStream() // 中断网络请求
  }

  // 重置所有状态
  // isAutoScrollEnabled.value = true
  // hasNewMessage.value = false
  // lastSeenMessageId.value = ''
  // showScrollToBottom.value = false
  // currentStreamingMessageId.value = ''
  // userScrolledDuringCurrentMessage.value = false
})

// 监听消息变化和流状态变化
watch(
  [() => state.value.currentMessages, () => streamControl.state.value],
  ([messages, streamState], [oldMessages, oldStreamState]) => {
    // 检测是否有新消息开始生成
    if (streamState.isStreaming &&
        (!oldStreamState?.isStreaming || streamState.messageId !== oldStreamState?.messageId)) {
      // 新消息开始生成，重置用户滚动标记
      userScrolledDuringCurrentMessage.value = false
      currentStreamingMessageId.value = streamState.messageId || ''
    }

    // 检测消息是否生成完毕
    if (oldStreamState?.isStreaming && !streamState.isStreaming) {
      // 消息生成完毕，重置用户滚动标记，为下一条消息准备
      userScrolledDuringCurrentMessage.value = false
      currentStreamingMessageId.value = ''
    }

    // 处理滚动
    if (state.value.isGenerating) {
      scrollToBottom() // 根据用户滚动状态决定是否自动滚动
    } else if (isAutoScrollEnabled.value) {
      scrollToBottom() // 用户在底部，自动滚动
    } else {
      // 检查是否有新消息
      hasNewMessage.value = checkNewMessages()
    }
  },
  { deep: true }
)

// 监听容器大小变化
useResizeObserver(messageListWrapper, () => {
  if (isAutoScrollEnabled.value) {
    scrollToBottom()
  }
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
      <div
        ref="messageListWrapper"
        class="message-list-wrapper"
      >
        <div class="main-window__content-container">
          <MessageList />
        </div>
      </div>

      <!-- 新消息提示 -->
      <div
        v-if="hasNewMessage"
        class="new-message-notice"
        @click="handleNewMessageClick"
      >
        <span>新消息</span>
      </div>
    </el-main>

    <!-- 输入框 -->
    <el-footer class="main-window__footer" height="auto">
      <!-- 滚动到底部按钮 -->
      <div
        v-if="showScrollToBottom && !hasNewMessage"
        class="scroll-to-bottom-btn"
        @click="scrollToBottom(true)"
      >
        <ChatIcon name="scroll-down" size="20"/>
      </div>
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
  position: relative; /* 为绝对定位元素提供定位上下文 */

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
    height: auto;
  }

  /* 滚动容器 */
  .message-list-wrapper {
    width: 100%;
    height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
    position: relative;

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
    position: relative; /* 添加相对定位，作为滚动按钮的定位父元素 */
  }
}

// 添加新消息提示样式
.new-message-notice {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--info-color);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 10;

  &:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

// 添加滚动到底部按钮样式
.scroll-to-bottom-btn {
  position: absolute;
  top: -45%;
  right: 35%;
  transform: translateX(55%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  box-shadow: 3px 4px 8px rgba(0, 0, 0, 0.15);
  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
}
</style>
