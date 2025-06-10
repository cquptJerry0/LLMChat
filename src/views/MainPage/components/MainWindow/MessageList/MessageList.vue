<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import MessageBubble from './components/MessageBubble.vue'

// 使用父组件提供的会话控制
const { state } = useConversationControlChild()

// 消息列表容器引用
const messageListRef = ref<HTMLDivElement | null>(null)

// 计算当前会话的消息
const messages = computed(() => {
  return state.value.currentMessages || []
})

// 是否正在生成
const isGenerating = computed(() => {
  return state.value.isGenerating
})

// 自动滚动到底部
const scrollToBottom = () => {
  if (!messageListRef.value) return

  setTimeout(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  }, 50)
}

// 监听消息变化，自动滚动到底部
watch(
  messages,
  () => {
    scrollToBottom()
  },
  { deep: true }
)

// 组件挂载后滚动到底部
onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="message-list" ref="messageListRef">
    <!-- 欢迎提示 -->
    <div v-if="messages.length === 0" class="message-list__welcome">
      <div class="message-list__welcome-content">
        <h2>欢迎使用 AI 助手</h2>
        <p>您可以向我提问任何问题，我会尽力回答。</p>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </template>

    <!-- 生成状态 -->
    <div v-if="isGenerating && messages.length > 0" class="message-list__generating">
      <div class="message-list__generating-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-list {
  height: 100%;
  overflow-y: auto;
  padding: $spacing-base;

  &__welcome {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    &-content {
      max-width: 500px;
      text-align: center;
      padding: $spacing-large;
      background-color: var(--background-color-light);
      border-radius: $border-radius-large;
      box-shadow: $box-shadow-light;

      h2 {
        margin-top: 0;
        color: var(--primary-color);
      }

      p {
        color: var(--text-secondary);
      }
    }
  }

  &__generating {
    display: flex;
    justify-content: center;
    padding: $spacing-base 0;

    &-indicator {
      display: flex;
      align-items: center;
      gap: 4px;

      span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--primary-color);
        animation: bounce 1.4s infinite ease-in-out both;

        &:nth-child(1) {
          animation-delay: -0.32s;
        }

        &:nth-child(2) {
          animation-delay: -0.16s;
        }
      }
    }
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
