<script setup lang="ts">
import { computed, inject } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
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
  }
}>()

// 使用父组件提供的会话控制
const { messageActions } = useConversationControlChild()

// 注入 getStreamControl 函数
const getStreamControlFn = inject<(messageId: string) => any>('getStreamControl') || messageActions.getStreamControl

// 获取流控制
const streamControl = computed(() => {
  if (props.message.role !== 'assistant') {
    return {
      isStreaming: { value: false },
      isPaused: { value: false },
      isError: { value: false },
      isComplete: { value: true },
      isIncomplete: { value: false }
    }
  }

  try {
    const control = getStreamControlFn(props.message.id)
    return control || {
      isStreaming: { value: false },
      isPaused: { value: false },
      isError: { value: false },
      isComplete: { value: true },
      isIncomplete: { value: false }
    }
  } catch (error) {
    console.error('获取流控制失败:', error)
    return {
      isStreaming: { value: false },
      isPaused: { value: false },
      isError: { value: true },
      isComplete: { value: false },
      isIncomplete: { value: false }
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
</script>

<template>
  <div class="message-wrapper" :class="{ 'message-wrapper--user': isUser, 'message-wrapper--assistant': !isUser }">
    <UserBubble
      v-if="isUser"
      :content="message.content"
    />
    <AssistantBubble
      v-else
      :content="message.content"
      :reasoning-content="message.reasoning_content"
      :is-streaming="streamControl.isStreaming?.value || false"
      :is-error="streamControl.isError?.value || false"
      :is-paused="streamControl.isPaused?.value || false"
      :avatar="'https://t8.baidu.com/it/u=4011543194,454374607&fm=193'"
      @copy="handleCopy"
      @retry="handleRetry"
      @like="handleLike"
      @share="handleShare"
    />
  </div>
</template>

<style lang="scss" scoped>
.message-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: $spacing-large;
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
