<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useTheme } from '@/composables/useTheme'
import ChatIcon from '@/components/ChatIcon.vue'
import ChatButton from '@/components/ChatButton.vue'
import SettingPanel from './components/SettingPanel.vue'
import ThemePanel from './components/ThemePanel.vue'
import { useNormalizedChatStore } from '@/stores/normalizedChat'

// 使用父组件提供的会话控制
const { state } = useConversationControlChild()
const chatStore = useNormalizedChatStore()

// 编辑标题相关状态
const isEditingTitle = ref(false)
const editedTitle = ref('')

// 计算当前会话标题
const conversationTitle = computed(() => {
  if (!state.value.currentConversationId) return '新的对话'

  // 查找当前会话
  const conversation = chatStore.conversations.get(state.value.currentConversationId)

  // 如果会话存在且有标题，直接返回
  if (conversation?.title) {
    return conversation.title
  }

  // 如果没有设置标题，使用第一条消息作为标题
  const firstMessage = state.value.rootMessages.find(
    msg => msg.conversationId === state.value.currentConversationId
  )

  return firstMessage?.content.substring(0, 20) || '新的对话'
})

// 开始编辑标题
const startEditingTitle = () => {
  editedTitle.value = conversationTitle.value
  isEditingTitle.value = true
  // 在下一个事件循环中聚焦输入框
  setTimeout(() => {
    const inputEl = document.getElementById('title-edit-input')
    if (inputEl) {
      inputEl.focus()
    }
  }, 0)
}

// 保存编辑的标题
const saveTitle = () => {
  if (state.value.currentConversationId && editedTitle.value.trim()) {
    console.log('手动设置标题:', editedTitle.value.trim());
    chatStore.updateConversation(state.value.currentConversationId, {
      title: editedTitle.value.trim(),
      titleSetByUser: true
    })

    // 立即检查标题是否设置成功
    setTimeout(() => {
      const conversationId = state.value.currentConversationId;
      if (conversationId) {
        const conversation = chatStore.conversations.get(conversationId);
        console.log('标题设置后的会话状态:', {
          title: conversation?.title,
          titleSetByUser: conversation?.titleSetByUser
        });
      }
    }, 0);
  }
  isEditingTitle.value = false
}

// 取消编辑标题
const cancelEditTitle = () => {
  isEditingTitle.value = false
}

// 处理按键事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    saveTitle()
  } else if (e.key === 'Escape') {
    cancelEditTitle()
  }
}

// 控制面板引用
const settingPanelRef = ref<InstanceType<typeof SettingPanel> | null>(null)
const themePanelRef = ref<InstanceType<typeof ThemePanel> | null>(null)

// 打开设置面板
const openSettingPanel = () => {
  settingPanelRef.value?.open()
}

// 打开主题面板
const openThemePanel = () => {
  themePanelRef.value?.open()
}

// 定义事件
defineEmits(['toggle-sidebar'])
</script>

<template>
  <el-header class="chat-header">
    <!-- 左侧 -->
    <div class="chat-header__left">
      <ChatButton
        type="default"
        :text="true"
        icon="back"
        @click="$emit('toggle-sidebar')"
      />

      <!-- 标题显示/编辑模式切换 -->
      <div v-if="!isEditingTitle" class="chat-header__title-container" @click="startEditingTitle">
        <h1 class="chat-header__title">{{ conversationTitle }}</h1>
        <ChatButton
          type="default"
          :text="true"
          icon="edit"
          class="chat-header__edit-btn"
          @click.stop="startEditingTitle"
        />
      </div>

      <!-- 标题编辑模式 -->
      <div v-else class="chat-header__title-edit">
        <el-input
          id="title-edit-input"
          v-model="editedTitle"
          placeholder="输入对话标题"
          size="small"
          @keydown="handleKeyDown"
          @blur="saveTitle"
        >
          <template #append>
            <ChatButton
              type="default"
              :text="true"
              icon="check"
              @click="saveTitle"
            />
          </template>
        </el-input>
      </div>
    </div>

    <!-- 右侧 -->
    <div class="chat-header__right">
      <ChatButton
        type="default"
        :text="true"
        icon="theme"
        @click="openThemePanel"
      />
      <ChatButton
        type="default"
        :text="true"
        icon="setting"
        @click="openSettingPanel"
      />
    </div>

    <!-- 设置面板 -->
    <SettingPanel ref="settingPanelRef" />

    <!-- 主题面板 -->
    <ThemePanel ref="themePanelRef" />
  </el-header>
</template>

<style lang="scss" scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 $spacing-base;
  background-color: var(--background-color-light);

  &__left {
    display: flex;
    align-items: center;
    gap: $spacing-small;
    flex: 1;
  }

  &__title-container {
    display: flex;
    align-items: center;
    gap: $spacing-small;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;

    &:hover {
      background-color: var(--background-color-hover);

      .chat-header__edit-btn {
        opacity: 1;
      }
    }
  }

  &__title {
    font-size: $font-size-large;
    font-weight: 500;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  &__edit-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &__title-edit {
    max-width: 300px;
    width: 100%;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-small;
  }
}

:deep(.el-input__wrapper) {
    box-shadow: 0px 0px 0px 0px;
}
:deep(.el-input__wrapper.is-focus) {
    box-shadow: rgb(186, 192, 199) 0px 0px 0px 1px inset !important;
}
</style>
