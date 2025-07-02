<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import ChatButton from '@/components/ChatButton.vue'

// 路由
const router = useRouter()

// 会话操作
const { conversationActions } = useConversationControlChild()
const chatStore = useNormalizedChatStore()

// 控制哪个会话hover显示菜单
const hoverId = ref<string | null>(null)
const menuOpenId = ref<string | null>(null)

// 计算会话列表
const conversations = computed(() => {
  return Array.from(chatStore.conversations.values())
    .sort((a, b) => (b.lastUpdatedAt || 0) - (a.lastUpdatedAt || 0))
    .map(conversation => {
      return {
        id: conversation.id,
        title: conversation.title,
        active: conversation.id === chatStore.currentConversationId,
      }
    })
})

// 用于防止重复快速切换的标志
const switchInProgress = ref(false)
const lastSwitchTime = ref(0)
const SWITCH_COOLDOWN = 500 // 毫秒

// 切换会话
const switchConversation = (id: string) => {
  const now = Date.now()

  // 如果正在切换或在冷却时间内，忽略点击
  if (switchInProgress.value || now - lastSwitchTime.value < SWITCH_COOLDOWN) {
    return
  }

  // 如果点击的是当前对话，忽略
  if (id === chatStore.currentConversationId) {
    return
  }

  // 设置标志并记录时间
  switchInProgress.value = true
  lastSwitchTime.value = now

  // 执行路由切换
  router.push({
    name: 'conversation',
    params: { conversationId: id }
  }).finally(() => {
    // 延迟重置标志，避免过快触发
    setTimeout(() => {
      switchInProgress.value = false
    }, SWITCH_COOLDOWN)
  })
}

// 编辑会话
const editConversation = (id: string) => {
  const conversation = chatStore.conversations.get(id)
  if (!conversation) return
  const newTitle = prompt('请输入新的会话标题', conversation.title)
  if (newTitle && newTitle.trim()) {
    chatStore.updateConversation(id, {
      title: newTitle.trim(),
      titleSetByUser: true
    })
  }
}

// 删除会话
const deleteConversation = (id: string) => {
  if (confirm('确定要删除这个会话吗？')) {
    const isCurrentConversation = id === chatStore.currentConversationId
    conversationActions.delete(id)

    // 如果删除的是当前对话，创建新对话
    if (isCurrentConversation) {
      const newId = conversationActions.create('新的对话')
      router.replace({
        name: 'conversation',
        params: { conversationId: newId }
      })
    }
  }
}

// 点击外部区域关闭菜单
const handleOutsideClick = (event: MouseEvent) => {
  if (menuOpenId.value !== null) {
    const popupElements = document.querySelectorAll('.chat-conversations__menu')
    const menuElements = document.querySelectorAll('.chat-conversations__menu-trigger')
    let clickedOutside = true

    // 检查点击是否在弹出菜单内
    popupElements.forEach(element => {
      if (element.contains(event.target as Node)) {
        clickedOutside = false
      }
    })

    // 检查点击是否在触发菜单按钮上
    menuElements.forEach(element => {
      if (element.contains(event.target as Node)) {
        clickedOutside = false
      }
    })

    if (clickedOutside) {
      menuOpenId.value = null
    }
  }
}

// 挂载和卸载事件监听器
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="chat-conversations">
    <div class="chat-conversations__header">
      <ChatIcon name="clock" />
      <span class="chat-conversations__header-text">历史会话</span>
    </div>
    <div v-if="conversations.length > 0" class="chat-conversations__content">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="chat-conversations__item"
        :class="{ 'chat-conversations__item--active': conversation.active }"
        @mouseenter="hoverId = conversation.id"
        @mouseleave="hoverId = null"
        @click="switchConversation(conversation.id)"
      >
        <div class="chat-conversations__spacer"></div>
        <span class="chat-conversations__item-title">{{ conversation.title }}</span>
        <ChatButton
          v-if="hoverId === conversation.id"
          icon="more"
          text
          size="small"
          iconColor="var(--text-secondary)"
          class="chat-conversations__menu-trigger"
          @click.stop="menuOpenId = conversation.id"
        />
        <div
          v-if="menuOpenId === conversation.id"
          class="chat-conversations__menu"
          @click.stop
        >
          <ChatButton
            icon="edit"
            text
            iconColor="var(--text-regular)"
            class="chat-conversations__menu-item"
            @click="editConversation(conversation.id); menuOpenId=null"
          >
            编辑标题
          </ChatButton>
          <ChatButton
            icon="delete"
            text
            iconColor="var(--danger-color)"
            class="chat-conversations__menu-item chat-conversations__menu-item--danger"
            @click="deleteConversation(conversation.id); menuOpenId=null"
          >
            删除
          </ChatButton>
        </div>
      </div>
    </div>

    <div v-else class="chat-conversations__empty">
      <div class="chat-conversations__empty-icon">💬</div>
      <div class="chat-conversations__empty-text">暂无对话</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-conversations {
  background: var(--background-color-base);
  overflow-y: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    margin-left: 18px;
    gap: 8px;
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    font-weight: 500;
    border-bottom: 1px solid var(--border-color-light);
    flex-shrink: 0;
  }

  &__header-text {
    font-size: 15px;
    font-weight: 600;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--border-color-base);
      border-radius: 2px;

      &:hover {
        background: var(--border-color-dark);
      }
    }
  }

  &__spacer {
    height: 10px;
    margin-right: 14px;
  }

  &__item {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 8px 12px 8px 18px;
    margin: 2px 8px;
    cursor: pointer;
    position: relative;
    border-radius: 8px;
    transition: all 0.2s ease;
    border: 1px solid transparent;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
      border-color: var(--background-color-light);
    }

    &--active {
      background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
      border-color: var(--background-color-light);
      color: var(--primary-color);
      font-weight: 600;

      .chat-conversations__item-title {
        color: var(--primary-color);
      }
    }
  }

  &__item-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.4;
  }

  &__menu-trigger {
    opacity: 0;
    transition: opacity 0.2s ease;
    margin-left: 8px;

    .chat-conversations__item:hover & {
      opacity: 1;
    }

    &:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.08);
    }
  }

  &__menu {
    position: absolute;
    right: 8px;
    top: 100%;
    min-width: 140px;
    background: var(--background-color-light);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 1000;
    padding: 8px;
    display: flex;
    flex-direction: column;
    animation: menuFadeIn 0.15s ease-out;

    @keyframes menuFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  }

  &__menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 10px 12px;
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    border-radius: 8px;
    background-color: transparent;
    border: none;
    transition: all 0.15s ease;
    color: var(--text-primary);

    &:hover {
      background: var(--background-color-hover);
      transform: translateX(2px);
    }

    &--danger {
      color: var(--danger-color);

      :deep(.chat-button__icon) {
        color: var(--danger-color);
      }

      &:hover {
        background: rgba(244, 67, 54, 0.08);
        color: var(--danger-color);
      }
    }
  }

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  &__empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  &__empty-text {
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
  }
}

@media (prefers-color-scheme: dark) {
  .chat-conversations {
    &__item {
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      &--active {
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%);
      }
    }

    &__menu {
      background: var(--background-color-elevated);
      border-color: var(--border-color-base);
    }

    &__menu-item {
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      &--danger:hover {
        background: rgba(244, 67, 54, 0.15);
      }
    }
  }
}
:deep(.chat-button) {
  font-weight: 390 !important;
  font-size: 14px !important;
}
:deep(.el-button+.el-button) {
  margin-left: 0;
}
</style>
