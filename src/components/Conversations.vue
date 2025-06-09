<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChatDotRound, Edit, Delete, Clock, Plus } from '@element-plus/icons-vue'
import type { ConversationItem, ConversationMenuCommand } from '@/types/conversations'
import { useChatStore } from '@/stores/chat'
import DialogEdit from '@/components/DialogEdit.vue'
import { Conversations } from 'vue-element-plus-x'

defineOptions({
  name: 'ChatConversations'
})

const chatStore = useChatStore()
const dialogEdit = ref<InstanceType<typeof DialogEdit> | null>(null)

// 当前选中的会话ID
const activeConversationId = computed(() => chatStore.currentConversationId)

// 格式化会话数据为 ConversationItem 格式
const conversationItems = computed(() => {
  return chatStore.conversations.map(conversation => {
    // 计算会话的日期分组
    const createdDate = new Date(conversation.createdAt || Date.now())
    const now = new Date()
    const isToday = createdDate.toDateString() === now.toDateString()
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === createdDate.toDateString()

    let group = '更早'
    if (isToday) {
      group = '今天'
    } else if (isYesterday) {
      group = '昨天'
    }

    return {
      id: conversation.id,
      label: conversation.title,
      group,
      prefixIcon: ChatDotRound,
      disabled: false
    }
  })
})

// 自定义菜单项
const menuItems = [
  {
    label: '重命名',
    key: 'rename',
    icon: Edit,
    command: 'rename'
  },
  {
    label: '删除',
    key: 'delete',
    icon: Delete,
    command: 'delete',
    menuItemHoverStyle: {
      color: 'red',
      backgroundColor: 'rgba(255, 0, 0, 0.1)'
    }
  }
]

// 处理菜单命令
const handleMenuCommand = (command: ConversationMenuCommand, item: ConversationItem) => {
  const conversationId = item.id as string

  if (command === 'rename') {
    dialogEdit.value?.openDialog(conversationId, 'edit')
  } else if (command === 'delete') {
    dialogEdit.value?.openDialog(conversationId, 'delete')
  }
}

// 处理会话选择
const handleConversationChange = (item: ConversationItem) => {
  chatStore.switchConversation(item.id as string)
}

// 自定义样式
const itemsStyle = {
  padding: '12px 16px',
  borderRadius: '6px',
  margin: '2px 0'
}

const itemsHoverStyle = {
  backgroundColor: '#f0f9eb'
}

const itemsActiveStyle = {
  backgroundColor: '#e8f5e9',
  borderLeft: '3px solid #67c23a'
}

// 分组排序配置
const groupOptions = {
  sort: (a: string, b: string) => {
    const order: Record<string, number> = { '今天': 0, '昨天': 1, '更早': 2 }
    return (order[a] ?? 999) - (order[b] ?? 999)
  }
}
</script>

<template>
  <div class="chat-conversations">
    <div class="chat-conversations__header">
      <h3>历史对话</h3>
      <el-button
        class="chat-conversations__new-btn"
        type="primary"
        size="small"
        :icon="Plus"
        @click="chatStore.createConversation()"
      >
        新建对话
      </el-button>
    </div>

    <Conversations
      v-model:active="activeConversationId"
      :items="conversationItems"
      :menu="menuItems"
      :items-style="itemsStyle"
      :items-hover-style="itemsHoverStyle"
      :items-active-style="itemsActiveStyle"
      :groupable="groupOptions"
      show-built-in-menu
      show-tooltip
      :label-max-width="180"
      row-key="id"
      label-key="label"
      @change="handleConversationChange"
      @menu-command="handleMenuCommand"
    >
      <!-- 自定义分组标题 -->
      <template #groupTitle="{ group }">
        <div class="chat-conversations__group-title">
          <el-icon v-if="group.title === '今天'"><Clock /></el-icon>
          {{ group.title }}
        </div>
      </template>

      <!-- 空状态 -->
      <template #footer v-if="conversationItems.length === 0">
        <div class="chat-conversations__empty">
          <p>暂无对话记录</p>
        </div>
      </template>
    </Conversations>

    <!-- 对话框组件 -->
    <DialogEdit ref="dialogEdit" />
  </div>
</template>

<style lang="scss" scoped>
.chat-conversations {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 300px;

  &__header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 300px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  &__new-btn {
    flex-shrink: 0;
  }

  &__group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    width: 300px;

    .el-icon {
      font-size: 14px;
    }
  }

  &__empty {
    padding: 20px;
    text-align: center;
    color: var(--el-text-color-secondary);
    width: 300px;
  }

  :deep(.conversations-container) {
    box-shadow: none;
    height: 100%;
    overflow: hidden;
    width: 300px;
  }

  :deep(.el-scrollbar__thumb) {
    display: none;
  }

  :deep(.conversations-list) {
    width: 300px;
    height: 100%;
    overflow: hidden;
  }
}
</style>
