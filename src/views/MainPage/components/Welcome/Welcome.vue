<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sender, Welcome } from 'vue-element-plus-x'
import type { CSSProperties } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ChatButton from '@/components/ChatButton.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 输入框内容和状态
const senderValue = ref('')
const senderRef = ref()
const inputStyle: CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-base)',
  fontWeight: 500,
  minHeight: '150px'
}

// 获取会话控制
const { messageActions, conversationActions } = useConversationControlChild()

// 计算占位符文本
const placeholder = '输入您的问题，按回车发送...'

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
    const newId = conversationActions.create(content.slice(0, 10))
    await messageActions.send(content)
    // 清空输入框
    senderRef.value?.clear()
    router.push({
      name: 'conversation',
      params: { conversationId: newId }
    })
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

</script>

<template>
  <div class="welcome">
    <div class="welcome__content">
      <Welcome
        variant="borderless"
        :style="{ background: 'transparent' }"
        title="LLM 智能对话助手"
        description="基于先进大语言模型的智能对话系统，支持多种模型，提供流畅的对话体验，帮助您解决各类问题"
      >
        <template #image>
          <div class="welcome__logo">
            <img src="@/assets/photo/LLM-chat.png" alt="LLM Chat Logo">
          </div>
        </template>
      </Welcome>

      <div class="welcome__features">
        <div class="welcome__feature">
          <i class="el-icon-chat-dot-round welcome__feature-icon"></i>
          <span>智能对话</span>
        </div>
        <div class="welcome__feature">
          <i class="el-icon-picture welcome__feature-icon"></i>
          <span>图片生成</span>
        </div>
      </div>
    </div>

    <div class="welcome__input">
      <Sender
        ref="senderRef"
        v-model="senderValue"
        variant="updown"
        :auto-size="{ minRows: 3, maxRows: 8 }"
        :input-style="inputStyle"
        class="welcome__sender"
        :placeholder="placeholder"
        clearable
        :submit-btn-disabled="!senderValue.trim()"
        @submit="handleSend"
        allow-speech
      >
        <template #prefix>
        </template>

        <template #action-list>
          <div class="welcome__actions">
            <ChatButton
              icon="image"
              text
              tooltip="图片"
              class="welcome__action-btn"
            />
            <ChatButton
              icon="attachment"
              text
              tooltip="附件"
              class="welcome__action-btn"
            />
            <ChatButton
              icon="send"
              type="primary"
              tooltip="发送 (Ctrl+Enter)"
              iconColor="var(--icon-color)"
              circle
              :disabled="!senderValue.trim()"
              @click="handleSend"
              class="welcome__send-btn"
            />
          </div>
        </template>
      </Sender>
    </div>
  </div>
</template>

<style scoped lang="scss">
.welcome {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: var(--spacing-xl);

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--spacing-xl);
    max-width: 600px;
    text-align: center;
  }

  &__logo {
    width: 120px;
    height: 120px;
    margin-bottom: var(--spacing-base);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &__features {
    display: flex;
    gap: var(--spacing-large);
    margin-top: var(--spacing-large);
  }

  &__feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-small);
    color: var(--text-regular);

    &-icon {
      font-size: 24px;
      color: var(--primary-color);
    }
  }

  &__input {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  &__sender {
    :deep(*) {
    --el-color-primary: var(--text-secondary) !important;
    }
    :deep(.el-sender) {
      border-radius: 20px !important;
      background-color: var(--background-color-light) !important;
    }
    :deep(.el-textarea__inner) {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-small) 0;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: var(--border-radius-small);

        &:hover {
          background: var(--text-secondary);
        }
      }
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-small);
    flex-wrap: wrap;
    padding: 0 var(--spacing-small);
  }

  &__action-btn {
    transition: all 0.2s ease;
    &:hover {
      transform: translateY(-2px);
    }
  }

  &__send-btn {
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      transform: scale(1.05);
    }
  }
}

</style>

