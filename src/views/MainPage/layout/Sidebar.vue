<script setup lang="ts">
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ConversationsList from '../components/Sidebar/ConversationsList.vue'
import ChatButton from '@/components/ChatButton.vue'
import ChatIcon from '@/components/ChatIcon.vue'
import SettingPanel from '../components/MainWindow/ChatHeader/components/SettingPanel.vue'
// 路由
const router = useRouter()
const isSidebarCollapsed = inject('isSidebarCollapsed')
// 使用父组件提供的会话控制
const { conversationActions } = useConversationControlChild()

// 创建新会话
const createNewConversation = () => {
  const newId = conversationActions.create()
  router.push({
    name: 'conversation',
    params: { conversationId: newId }
  })
}
const settingPanelRef = ref<InstanceType<typeof SettingPanel> | null>(null)
// 打开设置面板
const openSettingPanel = () => {
  settingPanelRef.value?.open()
}

// 定义事件
defineEmits(['toggle-sidebar'])
</script>

<template>
  <el-aside class="sidebar">
    <!-- 最顶部区域：Logo和伸缩按钮 -->
    <div class="sidebar__top" v-if="!isSidebarCollapsed">
      <div class="sidebar__logo">
        <img src="https://t8.baidu.com/it/u=4011543194,454374607&fm=193" alt="logo" class="logo-img" />
      </div>
      <div class="sidebar__collapse-btn">
        <ChatButton
          type="default"
          :text="true"
          icon="menu-fold"
          @click="$emit('toggle-sidebar')"
        />
      </div>
    </div>

    <!-- 顶部操作区 -->
    <div class="sidebar__header">
      <div class="new-chat-btn" @click="createNewConversation">
        <div class="new-chat-icon">
          <ChatIcon name="new" size="18" color="var(--text-primary)" />
        </div>
        <span class="new-chat-text">新建会话</span>
        <span class="new-chat-shortcut">Ctrl K</span>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="sidebar__content">
      <ConversationsList />
    </div>

    <!-- 底部区域 -->
    <div class="sidebar__footer">
      <ChatButton
        type="default"
        :text="true"
        icon="setting"
        @click="openSettingPanel"
        class="sidebar__settings-btn"
      >
        设置
      </ChatButton>
    </div>

    <SettingPanel ref="settingPanelRef" />
  </el-aside>
</template>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-color-base);
  width: 240px; /* 固定宽度 */
  min-width: 240px; /* 防止内容被压缩 */

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px $spacing-base 1px $spacing-base;
  }

  &__logo {
    display: flex;
    align-items: center;
    height: 28px;

    .logo-img {
      height: 100%;
      width: auto;
      border-radius: 4px;
    }
  }

  &__collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background-color: #f0f0f0;
    }
  }

  &__header {
    border-radius: $border-radius-base;
    padding:  $spacing-base $spacing-small  $spacing-small $spacing-small;
  }

  &__content {
    flex: 1;
    overflow-y: hidden;
    padding: $spacing-small 0;
  }

  &__footer {
    padding: $spacing-base;
    display: flex;
    justify-content: center;
  }

  &__settings-btn {
    width: 100%;
  }
}

.new-chat-btn {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: $border-radius-base;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    background: #f9f9f9;
  }

  .new-chat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
  }

  .new-chat-text {
    flex: 1;
    font-size: $font-size-base;
    color: var(--text-primary);
    font-weight: 500;
  }

  .new-chat-shortcut {
    color: var(--text-secondary);
    font-size: $font-size-small;
    background: #f5f5f5;
    border-radius: 4px;
    padding: 2px 4px;
  }
}
</style>
