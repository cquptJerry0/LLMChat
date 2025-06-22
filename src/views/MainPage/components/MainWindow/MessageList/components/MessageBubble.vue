<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useStreamControlChild } from '@/composables/useStreamControl_'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import type { UpdateCallback } from '@/types/api'
import { chatService } from '@/services/chat/chatService'
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
const { state: streamState } = streamControl

// 如果是当前消息且是助手消息，设置为活跃消息
onMounted(() => {
  if (props.isLatestMessage && props.message.role === 'assistant') {
    streamControl.setMessageId(props.message.id)
  }
})

// 创建流状态的计算属性
const messageStreamState = computed(() => {
  // 如果不是助手消息，返回默认状态
  if (props.message.role !== 'assistant') {
    return {
      isStreaming: false,
      isPaused: false,
      isError: false,
      isCompleted: true,
      isIncomplete: false
    }
  }

  // 检查是否是当前活跃消息
  const isActiveMessage = streamState.value.messageId === props.message.id
  if (!isActiveMessage) {
    return {
      isStreaming: false,
      isPaused: false,
      isError: false,
      isCompleted: true,
      isIncomplete: false
    }
  }

  return streamState.value
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
  }
}

// 恢复生成
const handleResume = async () => {
  if (messageStreamState.value.isPaused) {
    // 确保设置当前消息ID
    streamControl.setMessageId(props.message.id)

    // 使用简单恢复方法，不重新创建请求
    const success = streamControl.simpleResumeStream()

    if (!success) {
      console.warn('简单恢复失败，尝试完整恢复流程')
      try {
        // 创建回调函数
        const updateCallback: UpdateCallback = (
          content,
          reasoning_content,
          completion_tokens,
          speed
        ) => {
          // 使用 updateStream 更新内容
          streamControl.updateStream(
            content,
            reasoning_content,
            completion_tokens,
            speed
          )
        }

        // 使用 chatService 恢复生成
        const chatStore = useNormalizedChatStore()
        const message = chatStore.messages.get(props.message.id)
        if (message?.parentId) {
          const messageHistory = chatStore.getMessageHistory(message.parentId)
          await chatService.resumeChatCompletion(
            messageHistory,
            props.message.id,
            updateCallback
          )
        }
      } catch (error) {
        console.error('恢复生成失败:', error)
        streamControl.setStreamError('恢复生成失败')
      }
    }
  }
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
      :is-streaming="messageStreamState.isStreaming"
      :is-error="messageStreamState.isError"
      :is-paused="messageStreamState.isPaused"
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
