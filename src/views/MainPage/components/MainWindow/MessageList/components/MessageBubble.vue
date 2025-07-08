<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useStreamControlChild } from '@/composables/useStreamControl'
import UserBubble from './UserBubble.vue'
import AssistantBubble from './AssistantBubble.vue'

// 定义 props
const props = defineProps<{
  message: {
    id: string
    role: string
    content: string
    reasoning_content?: string
    parentId: string | null
    conversationId: string
  },
  isLatestMessage?: boolean,
}>()

// 使用父组件提供的会话控制
const { messageActions } = useConversationControlChild()

// 获取流控制状态
const streamControl = useStreamControlChild() as any

// 为当前消息创建独立的状态引用
const messageStreamState = ref({
  isStreaming: false,
  isError: false,
  isPaused: false,
  isContentComplete: false,
  isReasoningComplete: false
})

// 更新当前消息的流状态
const updateMessageStreamState = () => {
  if (props.message.role === 'assistant') {
    const globalState = streamControl.state.value

    // 仅当当前消息ID与全局状态中的消息ID匹配时，才更新状态
    if (globalState.messageId === props.message.id) {
      messageStreamState.value = {
        isStreaming: globalState.isStreaming,
        isError: globalState.isError,
        isPaused: globalState.isPaused,
        isContentComplete: globalState.isContentComplete,
        isReasoningComplete: globalState.isReasoningComplete
      }
    } else {
      // 如果不是当前活动消息，则设置为已完成状态
      messageStreamState.value = {
        isStreaming: false,
        isError: false,
        isPaused: false,
        isContentComplete: true,
        isReasoningComplete: true
      }
    }
  }
}

const content = computed(() =>  props.message.content)

// 如果是当前消息且是助手消息，设置为活跃消息
onMounted(() => {
  if (props.isLatestMessage && props.message.role === 'assistant') {
    streamControl.setMessageId(props.message.id)
    updateMessageStreamState()
  } else {
    // 非最新消息设置为已完成状态
    messageStreamState.value = {
      isStreaming: false,
      isError: false,
      isPaused: false,
      isContentComplete: true,
      isReasoningComplete: true
    }
  }
})

// 计算是否是用户消息
const isUser = computed(() => {
  return props.message.role === 'user'
})

// 复制消息内容
const handleCopy = () => {
  messageActions.copyMessage(props.message.id)
}

// 重新生成消息
const handleRetry = () => {
  if (props.message.parentId) {
    messageActions.resend(props.message.parentId)
  }
}

// 点赞/踩消息
const handleLike = (isLike: boolean) => {
  messageActions.likeMessage(props.message.id, isLike)
}

// 分享消息
const handleShare = () => {
  messageActions.shareMessage(props.message.id)
}

// 中断生成
const handlePause = () => {
  if (messageStreamState.value.isStreaming) {
    // 确保设置当前消息ID
    streamControl.setMessageId(props.message.id)
    // 只暂停流，不中断请求
    streamControl.pauseStream()
    // 更新本地状态
    messageStreamState.value.isPaused = true
    messageStreamState.value.isStreaming = false
  }
}

// 恢复生成
const handleResume = async () => {
  if (messageStreamState.value.isPaused) {
    streamControl.setMessageId(props.message.id)
    streamControl.resumeStream()
    // 更新本地状态
    messageStreamState.value.isPaused = false
    messageStreamState.value.isStreaming = true
  }
}

// 监控全局流状态变化，更新当前消息的状态
watch(() => streamControl.state.value, (newState) => {
  // 只有当前消息ID与全局状态中的消息ID匹配时，才更新状态
  if (props.message.id === newState.messageId) {
    updateMessageStreamState()
  }
}, { deep: true, immediate: true })

// 监控 isReasoningComplete 的变化（仅用于调试）
watch(() => messageStreamState.value.isReasoningComplete, (newVal) => {
  if (props.message.id === streamControl.state.value.messageId) {
    console.log(`[MessageBubble] isReasoningComplete 变化 (消息ID: ${props.message.id}):`, newVal)
  }
}, { immediate: true })
</script>

<template>
  <div class="message-wrapper" :class="{ 'message-wrapper--user': isUser, 'message-wrapper--assistant': !isUser }">
    <UserBubble
      v-if="isUser"
      :content="message.content"
    />
    <AssistantBubble
      v-else
      :content="content"
      :reasoning-content="message.reasoning_content"
      :is-streaming="messageStreamState.isStreaming"
      :is-error="messageStreamState.isError"
      :is-paused="messageStreamState.isPaused"
      :is-content-complete="messageStreamState.isContentComplete"
      :is-reasoning-complete="messageStreamState.isReasoningComplete"
      :avatar="'https://t8.baidu.com/it/u=4011543194,454374607&fm=193'"
      @copy="handleCopy"
      @retry="handleRetry"
      @like="handleLike"
      @share="handleShare"
      @pause="handlePause"
      @resume="handleResume"
    />
  </div>
</template>

<style lang="scss" scoped>
.message-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-large);
  width: 100%;
  max-width: 780px;

  &--user {
    align-items: flex-end;
  }

  &--assistant {
    align-items: flex-start;
  }
}
</style>

