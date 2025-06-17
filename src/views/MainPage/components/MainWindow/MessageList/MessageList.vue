<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import MessageBubble from './components/MessageBubble.vue'
import { useStreamControl } from '@/composables/useStreamControl_'
import VirtualScroller from './components/VirtualScroller.vue'
import NewMessageNotice from './components/NewMessageNotice.vue'
import { useScrollPosition } from './composables/useScrollPosition'
import { useMessageNotice } from './composables/useMessageNotice'

// 使用父组件提供的会话控制
const { state: conversationState } = useConversationControlChild()

// 初始化流控制
useStreamControl(conversationState.value.lastAssistantMessageId || '')

// 计算当前会话的消息
const messages = computed(() => {
  return conversationState.value.currentMessages || []
})

// 是否正在生成
const isGenerating = computed(() => {
  return conversationState.value.isGenerating
})

// 计算最后一条消息的ID
const lastMessageId = computed(() => {
  if (messages.value.length === 0) return null
  return messages.value[messages.value.length - 1].id
})

// 使用滚动位置管理
const {
  shouldAutoScroll,
  handleScroll,
  scrollToBottom,
  scrollToMessage
} = useScrollPosition()

// 使用新消息提示管理
const {
  newMessageCount,
  showNewMessageNotice,
  handleNewMessage,
  resetNotice
} = useMessageNotice(shouldAutoScroll)

// 监听消息变化
watch(
  messages,
  (newMessages, oldMessages) => {
    if (newMessages.length > (oldMessages?.length || 0)) {
      handleNewMessage()
      if (shouldAutoScroll.value) {
        scrollToBottom()
      }
    }
  },
  { deep: true }
)

// 组件挂载后滚动到底部
onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="message-list">
    <!-- 欢迎提示 -->
    <div v-if="messages.length === 0" class="message-list__welcome">
      <div class="message-list__welcome-content">
        <h2>欢迎使用 AI 助手</h2>
        <p>您可以向我提问任何问题，我会尽力回答。</p>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <VirtualScroller
        :messages="messages"
        :is-generating="isGenerating"
        :estimate-size="60"
        @scroll="handleScroll"
      />

      <!-- 新消息提示 -->
      <NewMessageNotice
        v-if="showNewMessageNotice"
        :count="newMessageCount"
        position="bottom"
        @click="() => {
          scrollToBottom()
          resetNotice()
        }"
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.message-list {
  height: 100%;
  position: relative;

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
}
</style>
