<script setup lang="ts">
import { computed, inject } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import ChatIcon from '@/components/ChatIcon.vue'
import ChatButton from '@/components/ChatButton.vue'
import type { Conversation } from '@/types/chat'

// 使用父组件提供的会话控制
const { state, conversationActions } = useConversationControlChild()

// 直接使用 normalizedChatStore 获取会话列表
const chatStore = useNormalizedChatStore()

// 计算会话列表
const conversations = computed(() => {
  // 从 chatStore 获取所有会话，并转换为数组
  const conversationsArray = Array.from(chatStore.conversations.values())
    .sort((a, b) => (b.lastUpdatedAt || 0) - (a.lastUpdatedAt || 0))

  return conversationsArray.map(conversation => {
    // 获取会话的第一条消息作为标题预览
    const messageIds = chatStore.conversationMessages.get(conversation.id) || []
    let previewTitle = conversation.title

    if (messageIds.length > 0) {
      // 找到第一条用户消息作为标题预览
      const userMessage = messageIds
        .map(id => chatStore.messages.get(id))
        .find(msg => msg?.role === 'user')

      if (userMessage && userMessage.content) {
        previewTitle = userMessage.content.length > 20
          ? `${userMessage.content.substring(0, 20)}...`
          : userMessage.content
      }
    }

    // 获取会话的消息数量
    const messageCount = messageIds.length

    return {
      id: conversation.id,
      title: previewTitle,
      active: conversation.id === chatStore.currentConversationId,
      lastUpdated: conversation.lastUpdatedAt || conversation.createdAt,
      messageCount
    }
  })
})

// 计算当前会话的消息
const currentMessages = computed(() => {
  return chatStore.currentConversationAllMessages
})

// 切换会话
const switchConversation = (id: string) => {
  conversationActions.switch(id)
}

// 删除会话
const deleteConversation = (id: string, event: Event) => {
  event.stopPropagation()

  if (confirm('确定要删除这个会话吗？')) {
    conversationActions.delete(id)
  }
}

// 编辑会话标题
const editConversation = (id: string, event: Event) => {
  event.stopPropagation()

  const conversation = chatStore.conversations.get(id)
  if (!conversation) return

  const newTitle = prompt('请输入新的会话标题', conversation.title)
  if (newTitle && newTitle.trim()) {
    chatStore.updateConversation(id, { title: newTitle.trim() })
  }
}

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return '未知时间'

  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
          <div class="conversations-list__item-info">
            <span class="conversations-list__item-title">{{ conversation.title }}</span>
            <span class="conversations-list__item-meta">
              {{ conversation.messageCount }} 条消息 ·
              {{ formatDate(conversation.lastUpdated) }}
            </span>
          </div>
        </div>

        <div class="conversations-list__item-actions">
          <ChatButton
            type="text"
            icon="edit"
            tooltip="编辑会话标题"
            size="small"
            @click="(e) => editConversation(conversation.id, e)"
          />
          <ChatButton
            type="text"
            icon="delete"
            tooltip="删除会话"
            size="small"
            @click="(e) => deleteConversation(conversation.id, e)"
          />
        </div>
      </div>
    </template>

    <div v-else class="conversations-list__empty">
      <p>暂无对话</p>
      <p>点击"新的对话"按钮开始聊天</p>
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
    border-bottom: 1px solid var(--border-color-light);

    &:hover {
      background-color: var(--border-color-light);

      .conversations-list__item-actions {
        opacity: 1;
      }
    }

    &--active {
      background-color: var(--primary-color-light);
      border-left: 3px solid var(--primary-color);

      &:hover {
        background-color: var(--primary-color-light);
      }
    }
  }

  &__item-content {
    display: flex;
    align-items: center;
    gap: $spacing-small;
    overflow: hidden;
    flex: 1;
  }

  &__item-icon {
    flex-shrink: 0;
  }

  &__item-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__item-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  &__item-meta {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-actions {
    display: flex;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &__empty {
    padding: $spacing-base;
    text-align: center;
    color: var(--text-secondary);

    p {
      margin: $spacing-small 0;
    }
  }
}
</style>
