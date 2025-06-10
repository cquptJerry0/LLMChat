<script setup lang="ts">
import { useConversationControlChild } from '@/composables/useConversationControl'
import ChatHeader from '../components/MainWindow/ChatHeader/ChatHeader.vue'
import MessageList from '../components/MainWindow/MessageList/MessageList.vue'
import ChatInput from '../components/MainWindow/ChatInput/ChatInput.vue'

// 使用父组件提供的会话控制
const { state } = useConversationControlChild()

// 定义事件
defineEmits(['toggle-sidebar'])
</script>

<template>
  <el-container class="main-window" direction="vertical">
    <!-- 头部 -->
    <ChatHeader @toggle-sidebar="$emit('toggle-sidebar')" />

    <!-- 消息列表 -->
    <el-main class="main-window__content">
      <MessageList />
    </el-main>

    <!-- 输入框 -->
    <el-footer class="main-window__footer" height="auto">
      <ChatInput />
    </el-footer>
  </el-container>
</template>

<style lang="scss" scoped>
.main-window {
  height: 100%;

  &__content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    position: relative;
  }

  &__footer {
    padding: $spacing-base;
    border-top: 1px solid var(--chat-border-color);
  }
}
</style>
