<script setup lang="ts">
import { ref } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ConversationsList from '../components/Sidebar/ConversationsList.vue'
import ChatButton from '@/components/ChatButton.vue'
import ChatIcon from '@/components/ChatIcon.vue'

// 使用父组件提供的会话控制
const { state, conversationActions, messageActions } = useConversationControlChild()

// 创建新会话
const createNewConversation = () => {
  conversationActions.create('新的对话')
}
</script>

<template>
  <el-aside class="sidebar">
    <!-- 顶部操作区 -->
    <div class="sidebar__header">
      <ChatButton
        type="primary"
        icon="new"
        class="sidebar__new-chat-btn"
        @click="createNewConversation"
      >
        新的对话
      </ChatButton>
    </div>

    <!-- 会话列表 -->
    <div class="sidebar__content">
      <ConversationsList />
    </div>

    <!-- 底部区域 -->
    <div class="sidebar__footer">
      <ChatButton
        type="text"
        icon="setting"
        class="sidebar__settings-btn"
      >
        设置
      </ChatButton>
    </div>
  </el-aside>
</template>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-color-base);

  &__header {
    padding: $spacing-base;
    border-bottom: 1px solid var(--border-color-light);
  }

  &__new-chat-btn {
    width: 100%;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-small 0;
  }

  &__footer {
    padding: $spacing-base;
    border-top: 1px solid var(--border-color-light);
    display: flex;
    justify-content: center;
  }

  &__settings-btn {
    width: 100%;
  }
}
</style>
