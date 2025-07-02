<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import MessageBubble from './components/MessageBubble.vue'
import { useStreamControl } from '@/composables/useStreamControl'
import { useStreamStore } from '@/stores/stream'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
// Props定义
defineProps<{
  isLatestMessage?: boolean
}>()

// 使用父组件提供的会话控制
const { state: conversationState } = useConversationControlChild()

// 计算当前会话的消息
const allMessages = computed(() => {
  return conversationState.value.currentMessages || []
})

// 获取最新消息
const latestMessage = computed(() => {
  // 访问refreshCounter触发依赖收集
  const _ = refreshCounter.value

  if (allMessages.value.length === 0) return null

  // 获取最后一条消息
  const message = allMessages.value[allMessages.value.length - 1]

  // 记录日志
  console.log('[MessageList] 计算latestMessage', {
    id: message.id,
    role: message.role,
    contentLength: message.content.length,
    refreshCounter: refreshCounter.value
  })

  return message
})

// 添加强制刷新计数器
const refreshCounter = ref(0)

// 初始化流控制，使用当前的lastAssistantMessageId
const streamControl = useStreamControl(conversationState.value.lastAssistantMessageId || '')

// 监听lastAssistantMessageId的变化，更新流控制的消息ID
watch(
  () => conversationState.value.lastAssistantMessageId,
  (newId) => {
    if (newId) {
      streamControl.setMessageId(newId)
    }
  }
)

// 监听流状态变化，当流状态变化时强制刷新latestMessage
watch(
  () => [streamControl.state.value.isContentComplete, streamControl.state.value.status],
  () => {
    // 增加计数器，强制刷新latestMessage
    refreshCounter.value++
  }
)

// 检查消息是否正在流式传输
const isMessageStreaming = computed(() => {
  return streamControl.state.value.isStreaming
})

// 检查最新消息是否是AI助手的消息
const isLatestMessageFromAssistant = computed(() => {
  if (!latestMessage.value) return false
  return latestMessage.value.role === 'assistant'
})

// 虚拟列表相关配置
const BATCH_SIZE = 4 // 一次加载的消息数量
const visibleMessages = ref<any[]>([]) // 历史可见的消息
const startIndex = ref(0) // 起始索引
const endIndex = ref(0) // 结束索引

// 观察器元素引用
const topSentinelRef = ref<HTMLElement | null>(null)
const bottomSentinelRef = ref<HTMLElement | null>(null)

// 历史消息（除了最新的正在流式输出的消息）
const historicalMessages = computed(() => {
  if (allMessages.value.length === 0) return []

  // 如果最新消息正在流式输出，排除它
  if (isMessageStreaming.value && isLatestMessageFromAssistant.value) {
    return allMessages.value.slice(0, -1)
  }

  return allMessages.value
})

// 是否显示最新消息作为单独项
const shouldShowLatestMessageSeparately = computed(() => {
  return isMessageStreaming.value &&
         latestMessage.value !== null &&
         isLatestMessageFromAssistant.value &&
         !visibleMessages.value.some(msg => msg.id === latestMessage.value?.id)
})

// 更新可见的历史消息
const updateVisibleMessages = () => {
  if (historicalMessages.value.length === 0) {
    visibleMessages.value = []
    return
  }

  // 确保索引在有效范围内
  const end = Math.min(endIndex.value, historicalMessages.value.length)
  const start = Math.max(0, startIndex.value)

  // 更新可见消息
  visibleMessages.value = historicalMessages.value.slice(start, end)
}

// 初始化可见消息
const initVisibleMessages = () => {
  if (historicalMessages.value.length <= BATCH_SIZE * 2) {
    // 如果消息数量较少，显示所有消息
    startIndex.value = 0
    endIndex.value = historicalMessages.value.length
  } else {
    // 否则只显示最后一批消息
    startIndex.value = Math.max(0, historicalMessages.value.length - BATCH_SIZE)
    endIndex.value = historicalMessages.value.length
  }

  updateVisibleMessages()
}

// 获取外部滚动容器
const getScrollContainer = () => document.querySelector('.message-list-wrapper')

// 创建交叉观察器
let topObserver: IntersectionObserver | null = null
let bottomObserver: IntersectionObserver | null = null

// 设置观察器
const setupObservers = () => {
  const scrollContainer = getScrollContainer()
  if (!scrollContainer) return

  // 创建顶部观察器 - 向上加载更多消息
  topObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && startIndex.value > 0) {
        startIndex.value = Math.max(0, startIndex.value - BATCH_SIZE)
        updateVisibleMessages()
      }
    },
    {
      root: scrollContainer,
      rootMargin: '200px 0px 0px 0px',
      threshold: 0
    }
  )

  // 创建底部观察器 - 向下加载更多消息
  bottomObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && endIndex.value < historicalMessages.value.length) {
        endIndex.value = Math.min(historicalMessages.value.length, endIndex.value + BATCH_SIZE)
        updateVisibleMessages()
      }
    },
    {
      root: scrollContainer,
      rootMargin: '0px 0px 200px 0px',
      threshold: 0
    }
  )
}

// 观察哨兵元素
const observeSentinels = () => {
  if (topObserver && topSentinelRef.value) {
    topObserver.observe(topSentinelRef.value)
  }

  if (bottomObserver && bottomSentinelRef.value) {
    bottomObserver.observe(bottomSentinelRef.value)
  }
}

// 监听历史消息变化
watch(
  historicalMessages,
  (newMessages, oldMessages) => {
    const newLength = newMessages.length
    const oldLength = oldMessages?.length || 0

    // 只在消息数量变化时更新
    if (newLength !== oldLength) {
      if (newLength > oldLength) {
        // 新增消息 - 确保新消息在可见范围内
        endIndex.value = newLength

        // 如果消息数量变化较大，调整起始索引
        if (oldLength === 0 || newLength - oldLength > BATCH_SIZE) {
          startIndex.value = Math.max(0, newLength - BATCH_SIZE)
        }
      } else {
        // 消息减少，重新初始化
        initVisibleMessages()
      }

      updateVisibleMessages()
    }
  },
  { deep: true }
)

// 监听自定义事件
const handleStreamCompleted = (event: CustomEvent) => {
  // 获取事件中的消息内容
  const { messageId, content, reasoning_content } = event.detail

  // 获取消息对象
  const messageIndex = allMessages.value.findIndex(msg => msg.id === messageId)

  if (messageIndex !== -1 && latestMessage.value && allMessages.value[messageIndex].id === latestMessage.value.id) {
    console.log('[MessageList] 准备更新latestMessage', {
      oldLength: latestMessage.value.content?.length,
      newLength: (content || allMessages.value[messageIndex].content)?.length,
      isContentComplete: true
    })

    // 强制更新消息对象 - 直接修改数组中的对象
    const updatedContent = content || allMessages.value[messageIndex].content
    const updatedReasoningContent = reasoning_content || allMessages.value[messageIndex].reasoning_content

    // 直接更新数组中的对象，确保Vue能够检测到变化
    allMessages.value.splice(messageIndex, 1, {
      ...allMessages.value[messageIndex],
      content: updatedContent,
      reasoning_content: updatedReasoningContent
    })

    // 同时更新latestMessage引用
    latestMessage.value.content = updatedContent
    latestMessage.value.reasoning_content = updatedReasoningContent

    console.log('[MessageList] 更新latestMessage内容', latestMessage.value.content)

    // 确保流状态也被正确更新
    streamControl.state.value.isContentComplete = true
    streamControl.state.value.isPaused = false
    streamControl.state.value.isStreaming = false
    streamControl.state.value.isCompleted = true

    const chatStore = useNormalizedChatStore()
    chatStore.updateMessage(messageId, {
      content: updatedContent,
      reasoning_content: updatedReasoningContent
    })
  }

  // 增加刷新计数器，强制重新渲染
  refreshCounter.value++
}

// 组件挂载时初始化
onMounted(() => {
  nextTick(() => {
    initVisibleMessages()

    // 延迟设置观察器，确保外部滚动容器已经渲染
    setTimeout(() => {
      setupObservers()
      observeSentinels()
    }, 100)
  })

  // 添加自定义事件监听
  window.addEventListener('stream-completed', handleStreamCompleted as EventListener)
})

// 组件卸载时清理
onUnmounted(() => {
  if (topObserver) {
    topObserver.disconnect()
  }

  if (bottomObserver) {
    bottomObserver.disconnect()
  }

  // 移除事件监听
  window.removeEventListener('stream-completed', handleStreamCompleted as EventListener)
})
</script>

<template>
  <div class="message-list">
    <!-- 欢迎提示 -->
    <div v-if="allMessages.length === 0" class="message-list__welcome">
      <div class="message-list__welcome-content">
        <h2>欢迎使用 AI 助手</h2>
        <p>您可以向我提问任何问题，我会尽力回答。</p>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <div class="message-list__virtual-container">
        <!-- 顶部哨兵 -->
        <div ref="topSentinelRef" class="message-list__sentinel message-list__sentinel--top"></div>

        <!-- 历史消息（虚拟列表） -->
        <MessageBubble
          v-for="message in visibleMessages"
          :key="message.id"
          :message="message"
          :isLatestMessage="false"
          class="message-list__message"
        />

        <!-- 底部哨兵 -->
        <div ref="bottomSentinelRef" class="message-list__sentinel message-list__sentinel--bottom"></div>

        <!-- 最新的流式消息（单独渲染，不受虚拟列表控制） -->
        <MessageBubble
          v-if="shouldShowLatestMessageSeparately && latestMessage"
          :key="latestMessage.id"
          :message="latestMessage"
          :isLatestMessage="true"
          class="message-list__message"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.message-list {
  padding: var(--spacing-base);

  &__welcome {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    &-content {
      max-width: 500px;
      text-align: center;
      padding: var(--spacing-large);
      background-color: var(--background-color-light);
      border-radius: var(--border-radius-large);
      box-shadow: var(--box-shadow-light);

      h2 {
        margin-top: 0;
        color: var(--primary-color);
      }

      p {
        color: var(--text-secondary);
      }
    }
  }

  &__virtual-container {
    width: 100%;
    position: relative;
  }

  &__message {
    position: relative;
    margin-bottom: 16px;
  }

  &__sentinel {
    height: 5px;
    width: 100%;
    visibility: hidden;

    &--top {
      margin-bottom: 8px;
    }

    &--bottom {
      margin-top: 8px;
    }
  }
}
</style>
