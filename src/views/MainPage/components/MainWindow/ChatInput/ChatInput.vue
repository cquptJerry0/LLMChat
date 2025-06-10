<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ChatButton from '@/components/ChatButton.vue'
import ChatIcon from '@/components/ChatIcon.vue'

// 使用父组件提供的会话控制
const { state, messageActions } = useConversationControlChild()

// 输入框内容
const inputContent = ref('')

// 是否正在生成
const isGenerating = computed(() => {
  return state.value.isGenerating
})

// 发送消息
const sendMessage = async () => {
  if (!inputContent.value.trim() || isGenerating.value) return

  const content = inputContent.value
  inputContent.value = ''

  await messageActions.send(content)
}

// 处理按键事件
const handleKeyDown = (event: KeyboardEvent) => {
  // 按下 Ctrl+Enter 发送消息
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="chat-input">
    <div class="chat-input__container">
      <!-- 输入框 -->
      <div class="chat-input__textarea-container">
        <el-input
          v-model="inputContent"
          type="textarea"
          :rows="3"
          :placeholder="isGenerating ? '正在生成回复...' : '输入消息，Ctrl+Enter 发送'"
          :disabled="isGenerating"
          resize="none"
          @keydown="handleKeyDown"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="chat-input__actions">
        <ChatButton
          type="primary"
          icon="send"
          :disabled="!inputContent.trim() || isGenerating"
          @click="sendMessage"
        >
          发送
        </ChatButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-input {
  width: 100%;

  &__container {
    display: flex;
    flex-direction: column;
    gap: $spacing-base;
    padding: $spacing-base;
    background-color: var(--chat-input-background);
    border-radius: $border-radius-base;
    box-shadow: $box-shadow-light;
  }

  &__textarea-container {
    width: 100%;

    :deep(.el-textarea__inner) {
      min-height: 80px;
      resize: none;
      border-radius: $border-radius-base;
      background-color: var(--background-color-light);
      border-color: var(--border-color-base);
      transition: all 0.3s ease;

      &:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(124, 102, 255, 0.1);
      }
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
