<script setup lang="ts">
import { onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useConversationControl } from '@/composables/useConversationControl'
import ChatLayout from './layout/ChatLayout.vue'

// 初始化主题
const { currentTheme, setTheme } = useTheme()

// 初始化会话控制
// 注意：useConversationControl 内部已经实现了 provide/inject 机制
// 不需要我们手动 provide
const {
  state: conversationState,
  conversationActions,
  messageActions
} = useConversationControl()

// 创建默认会话（如果没有活动会话）
onMounted(() => {
  if (!conversationState.value.currentConversationId) {
    conversationActions.create('新的对话')
  }
})
</script>

<template>
  <div class="main-page">
    <ChatLayout />
  </div>
</template>

<style lang="scss" scoped>
.main-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: var(--chat-background);
  color: var(--text-primary);
}
</style>
