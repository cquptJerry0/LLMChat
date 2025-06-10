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
      <div class="message-list-wrapper">
        <div class="main-window__content-container">
          <MessageList />
        </div>
      </div>
    </el-main>

    <!-- 输入框 -->
    <el-footer class="main-window__footer" height="auto">
      <div class="main-window__footer-container">
        <ChatInput />
      </div>
    </el-footer>
  </el-container>
</template>

<style lang="scss" scoped>
.main-window {
  height: 100%;
  background-color: #fff;
  &__content {
    flex: 1;
    padding: 0;
    position: relative;
    overflow: hidden; /* 防止主容器出现滚动条 */
  }

  &__content-container {
    max-width: 780px;
    margin: 0 auto;
    width: 100%;
  }

  /* 创建一个内容包装器 */
  .message-list-wrapper {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
      width: 8px;
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      visibility: hidden;
      background-color: #c1c1c1;
      border-radius: 4px;
    }

    &:hover::-webkit-scrollbar-thumb {
      visibility: visible;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: #a8a8a8;
    }
  }

  &__footer-container {
    max-width: 768px;
    height: 100%;
    margin: 0 auto;
    width: 100%;
  }

  &__footer {
    min-height: 180px;
    height: auto;
    background-color: #fff;
    padding: 0;
  }
}

</style>
