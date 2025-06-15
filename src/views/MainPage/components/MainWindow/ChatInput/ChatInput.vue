<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sender } from 'vue-element-plus-x'
import type { CSSProperties } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { useStreamControlChild } from '@/composables/useStreamControl_'
import type { StreamControlContext } from '@/types/streamControl'
import type { UpdateCallback } from '@/types/api'
import { chatService } from '@/services/chat/chatService'
import ChatButton from '@/components/ChatButton.vue'

// 输入框内容和状态
const senderValue = ref('')
const senderRef = ref()
const inputStyle: CSSProperties = {
  backgroundColor: 'transparent',
  color: '#303133',
  fontSize: '14px',
  fontWeight: 500,
  minHeight: '150px'
}

// 获取会话控制
const { messageActions } = useConversationControlChild()

// 获取流控制
const streamControl = useStreamControlChild() as any // 临时使用any类型避免类型错误
const { state: streamState } = streamControl

// 计算占位符文本
const placeholder = computed(() => {
  return streamState.value.isStreaming
    ? '正在生成回复，按 Esc 中断...'
    : streamState.value.isPaused
      ? '生成已中断，按 Ctrl+R 继续...'
      : '输入消息，按 Ctrl+Enter 发送...'
})

// 处理发送按钮图标颜色
const sendButtonIconColor = computed(() => {
  return !senderValue.value.trim() ? 'var(--icon-color)' : 'var(--icon-color-secondary)'
})

// 处理发送消息
const handleSend = async () => {
  if (!senderValue.value.trim()) return

  try {
    // 发送消息
    const content = senderValue.value.trim()
    await messageActions.send(content)

    // 清空输入框
    senderRef.value?.clear()
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 中断生成
const handleStop = () => {
  if (streamState.value.isStreaming && streamState.value.messageId) {
    // 只暂停流，不中断请求
    streamControl.pauseStream()
  }
}

// 恢复生成
const handleResume = async () => {
  if (streamState.value.isPaused && streamState.value.messageId) {
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
        const messageId = streamState.value.messageId
        const message = chatStore.messages.get(messageId)
        if (message?.parentId) {
          const messageHistory = chatStore.getMessageHistory(message.parentId)
          await chatService.resumeChatCompletion(
            messageHistory,
            messageId,
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

// 处理语音识别状态变化
const handleRecordingChange = (isRecording: boolean) => {
  console.log('语音识别状态:', isRecording)
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  // 如果是在输入法编辑状态，不处理快捷键
  if (event.isComposing) return

  // Ctrl+Enter 发送消息
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    handleSend()
    return
  }

  // Ctrl+R 继续生成
  if (event.ctrlKey && event.key === 'r' && streamState.value.isPaused) {
    event.preventDefault()
    event.stopPropagation()
    handleResume()
  }
}

// 移除全局键盘事件监听，因为已经在MainWindow中处理了
</script>

<template>
  <div class="chat-input-wrapper">
    <div class="textarea-container">
      <Sender
        ref="senderRef"
        v-model="senderValue"
        variant="updown"
        :auto-size="{ minRows: 3, maxRows: 8 }"
        :input-style="inputStyle"
        class="custom-sender"
        :placeholder="placeholder"
        :loading="streamState.isStreaming"
        clearable
        :submitType=undefined
        :submit-btn-disabled="!senderValue.trim()"
        @keydown="handleKeydown"
        @submit="handleSend"
        @cancel="handleStop"
        @recording-change="handleRecordingChange"
        allow-speech
      >
        <template #prefix>
        </template>

        <template #action-list>
          <div class="button-group">
            <ChatButton
              icon="image"
              text
              tooltip="图片"
            />
            <ChatButton
              icon="attachment"
              text
              tooltip="附件"
            />
            <ChatButton
              v-if="!streamState.isStreaming && !streamState.isPaused"
              icon="send"
              type="primary"
              tooltip="发送 (Ctrl+Enter)"
              :iconColor="sendButtonIconColor"
              circle
              :disabled="!senderValue.trim()"
              @click="handleSend"
            />
            <ChatButton
              v-else-if="streamState.isStreaming"
              icon="pause"
              type="warning"
              tooltip="中断生成 (Esc)"
              iconColor="var(--icon-color-secondary)"
              circle
              @click="handleStop"
            />
            <ChatButton
              v-else-if="streamState.isPaused"
              icon="play"
              type="success"
              tooltip="继续生成 (Ctrl+R)"
              iconColor="var(--icon-color-secondary)"
              circle
              @click="handleResume"
            />
        </div>
        </template>
      </Sender>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  min-height: 150px;
  :deep(*) {
    --el-color-primary: var(--text-secondary) !important;
  }
}

.textarea-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
    width: 100%;
}

:deep(.el-sender) {
  border-radius: 20px !important;
  background-color: var(--background-color-light) !important;
  }

:deep(.el-textarea__inner) {
  flex: 1;
    overflow-y: auto;
    padding: 8px 0;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--border-color-base);
      border-radius: 2px;

      &:hover {
        background: var(--border-color-dark);
      }
    }
  }

.button-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

