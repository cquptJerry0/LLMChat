<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import { useTheme } from '@/composables/useTheme'
import ChatIcon from '@/components/ChatIcon.vue'
import ChatButton from '@/components/ChatButton.vue'
import SettingPanel from './components/SettingPanel.vue'
import ThemePanel from './components/ThemePanel.vue'

// 使用父组件提供的会话控制
const { state } = useConversationControlChild()

// 使用主题控制
const { currentTheme, setTheme } = useTheme()

// 计算当前会话标题
const conversationTitle = computed(() => {
  if (!state.value.currentConversationId) return '新的对话'

  // 查找当前会话的第一条消息作为标题
  const firstMessage = state.value.rootMessages.find(
    msg => msg.conversationId === state.value.currentConversationId
  )

  return firstMessage?.content.substring(0, 20) || '新的对话'
})

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
        type="text"
        icon="back"
        @click="$emit('toggle-sidebar')"
      />
      <h1 class="chat-header__title">{{ conversationTitle }}</h1>
    </div>

    <!-- 右侧 -->
    <div class="chat-header__right">
      <ChatButton
        type="text"
        icon="theme"
        @click="openThemePanel"
      />
      <ChatButton
        type="text"
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
  height: $chat-header-height;
  padding: 0 $spacing-base;
  border-bottom: 1px solid var(--chat-border-color);
  background-color: var(--background-color-light);

  &__left {
    display: flex;
    align-items: center;
    gap: $spacing-small;
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

  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-small;
  }
}
</style>
