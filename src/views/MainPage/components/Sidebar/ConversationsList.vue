<script setup lang="ts">
import { computed } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ChatIcon from '@/components/ChatIcon.vue'
import ChatButton from '@/components/ChatButton.vue'
import type { Conversation } from '@/types/chat'

// 使用父组件提供的会话控制
const { state, conversationActions } = useConversationControlChild()

// 计算会话列表
const conversations = computed(() => {
  // 这里假设 state.value 中有 conversations 数组
  // 如果没有，需要根据实际情况调整
  return state.value.rootMessages.map(msg => {
    return {
      id: msg.conversationId,
      title: msg.content.substring(0, 20) || '新的对话',
      active: msg.conversationId === state.value.currentConversationId
    }
  })
})

// 切换会话
const switchConversation = (id: string) => {
  conversationActions.switch(id)
}

// 删除会话
const deleteConversation = (id: string, event: Event) => {
  event.stopPropagation()
  conversationActions.delete(id)
}
</script>

<template>
  <div class="conversations-list">
    <template v-if="conversations.length > 0">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversations-list__item"
        :class="{ 'conversations-list__item--active': conversation.active }"
        @click="switchConversation(conversation.id)"
      >
        <div class="conversations-list__item-content">
          <ChatIcon name="chat" class="conversations-list__item-icon" />
          <span class="conversations-list__item-title">{{ conversation.title }}</span>
        </div>

        <div class="conversations-list__item-actions">
          <ChatButton
            type="text"
            icon="delete"
            size="small"
            @click="(e) => deleteConversation(conversation.id, e)"
          />
        </div>
      </div>
    </template>

    <div v-else class="conversations-list__empty">
      <p>暂无对话</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.conversations-list {
  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-small $spacing-base;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--border-color-light);

      .conversations-list__item-actions {
        opacity: 1;
      }
    }

    &--active {
      background-color: var(--primary-color);
      color: white;

      &:hover {
        background-color: var(--primary-color);
      }
    }
  }

  &__item-content {
    display: flex;
    align-items: center;
    gap: $spacing-small;
    overflow: hidden;
  }

  &__item-icon {
    flex-shrink: 0;
  }

  &__item-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-actions {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &__empty {
    padding: $spacing-base;
    text-align: center;
    color: var(--text-secondary);
  }
}
</style>
