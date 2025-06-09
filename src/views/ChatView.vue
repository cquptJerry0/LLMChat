<script setup lang="ts">
import ChatInput from '@/components/ChatInput.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import { Menu as IconMenu, Plus, Expand } from '@element-plus/icons-vue'
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { messageHandler } from '@/utils/messageHandler'
import { createChatCompletion } from '@/utils/api'
import { useSettingStore } from '@/stores/setting'
import SettingsPanel from '@/components/SettingsPanel.vue'
import DialogEdit from '@/components/DialogEdit.vue'
import ChatSidebar from '@/components/Sidebar.vue'
import { useRouter } from 'vue-router'
import { icons } from '@/constants/icons'

// 移动端侧边栏显示状态
const isSidebarVisible = ref(false)
const mouseEnterTimeout = ref<number | null>(null)
const mouseLeaveTimeout = ref<number | null>(null)
const enableMouseTracking = ref(true)  // 控制是否启用鼠标监听
const sidebarMode = ref<'overlay' | 'below-header'>('overlay')

// 获取聊天消息
const chatStore = useChatStore()
const currentMessages = computed(() => chatStore.currentMessages)
const isLoading = computed(() => chatStore.isLoading)
const settingStore = useSettingStore()

// 获取消息容器
const messagesContainer = ref<HTMLDivElement | null>(null)
// 监听消息变化，不再需要滚动到底部
watch(
  currentMessages,
  () => {
    // 消息变化时的处理，不再滚动
  },
  { deep: true },
)

onMounted(() => {
  // 当没有对话时，默认新建一个对话
  if (chatStore.conversations.length === 0) {
    chatStore.createConversation()
  }
  document.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  if (mouseEnterTimeout.value) clearTimeout(mouseEnterTimeout.value)
})

interface MessageContent {
  content: string
  files: any[]
}

// 发送消息
const handleSend = async (messageContent: MessageContent) => {
  try {
    // 添加用户消息
    chatStore.addMessage(
      messageHandler.formatMessage('user', messageContent.content, '', messageContent.files),
    )
    // 添加空的助手消息
    chatStore.addMessage(messageHandler.formatMessage('assistant', '', ''))

    // 设置loading状态
    chatStore.setIsLoading(true)
    const lastMessage = chatStore.getLastMessage()
    if (lastMessage) {
      lastMessage.loading = true
    }

    // 调用API获取回复
    const messages = chatStore.currentMessages.map(({ role, content }) => ({ role, content }))
    const response = await createChatCompletion(messages)

    // 使用封装的响应处理函数
    await messageHandler.handleResponse(
      response,
      settingStore.settings.stream,
      (content, reasoning_content, tokens, speed) => {
        chatStore.updateLastMessage(content, reasoning_content, tokens, speed)
      },
    )
  } catch (error) {
    console.error('Failed to send message:', error)
    chatStore.updateLastMessage('抱歉，发生了一些错误，请稍后重试。', '', 0, '0')
  } finally {
    // 重置loading状态
    chatStore.setIsLoading(false)
    const lastMessage = chatStore.getLastMessage()
    if (lastMessage) {
      lastMessage.loading = false
    }
  }
}

// 重新生成的处理函数
const handleRegenerate = async () => {
  try {
    // 获取最后一条用户消息
    const lastUserMessage = chatStore.currentMessages[chatStore.currentMessages.length - 2]
    // 使用 splice 删除最后两个元素
    chatStore.currentMessages.splice(-2, 2)
    await handleSend({ content: lastUserMessage.content, files: lastUserMessage.files })
  } catch (error) {
    console.error('Failed to regenerate message:', error)
  }
}

// 添加抽屉引用
const settingDrawer = ref<InstanceType<typeof SettingsPanel>>()

// 获取当前对话标题
const currentTitle = computed(() => chatStore.currentConversation?.title || 'LLM Chat')
// 格式化标题
const formatTitle = (title: string) => {
  return title.length > 4 ? title.slice(0, 4) + '...' : title
}

// 添加对话框组件
const dialogEdit = ref<InstanceType<typeof DialogEdit>>()

// 获取路由实例
const router = useRouter()

// 处理返回首页
const handleBack = async () => {
  router.push('/')
}

// 处理新建对话
const handleNewChat = () => {
  chatStore.createConversation()
}

// 显示侧边栏
const showSidebar = () => {
  isSidebarVisible.value = true
  sidebarMode.value = 'overlay'
  enableMouseTracking.value = false  // 手动展开时禁用鼠标监听
}

// 隐藏侧边栏
const hideSidebar = () => {
  isSidebarVisible.value = false
  enableMouseTracking.value = true   // 关闭侧边栏时重新启用鼠标监听
}

// 处理鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  if (!enableMouseTracking.value) return  // 如果禁用了鼠标监听，直接返回

  if (!isSidebarVisible.value && e.clientX < 15) {
    if (mouseLeaveTimeout.value) clearTimeout(mouseLeaveTimeout.value)
    mouseEnterTimeout.value = window.setTimeout(() => {
      isSidebarVisible.value = true
      sidebarMode.value = 'below-header'
      enableMouseTracking.value = true  // 鼠标触发的展开保持鼠标监听
    }, 300)
  } else if (isSidebarVisible.value && e.clientX > 300) {
    mouseLeaveTimeout.value = window.setTimeout(() => {
      hideSidebar()
    }, 500)
  }
}
</script>

<template>
  <div class="chat-container" :class="{ 'sidebar-visible': isSidebarVisible, [`sidebar-mode-${sidebarMode}`]: isSidebarVisible }">
    <!-- 侧边栏 -->
    <ChatSidebar
      v-if="isSidebarVisible"
      :display-mode="sidebarMode"
      @close="hideSidebar"
    />

    <!-- 聊天容器 -->
    <div class="chat-view">
      <!-- 聊天头部 -->
      <div class="chat-view__header">
        <div class="chat-view__header-left">
          <div class="chat-view__actions" v-if="!isSidebarVisible">
            <el-button
              class="chat-view__new-chat-btn"
              type="primary"
              :icon="Plus"
              @click="handleNewChat"
            >
            </el-button>
            <el-button
              class="chat-view__expand-btn"
              :icon="Expand"
              @click="showSidebar"
            >
            </el-button>
          </div>
          <div class="chat-view__divider"></div>
          <div class="chat-view__title-wrapper">
            <h1 class="chat-view__title">{{ formatTitle(currentTitle) }}</h1>
            <button
              class="chat-view__edit-btn"
              @click="dialogEdit.openDialog(chatStore.currentConversationId, 'edit')"
            >
              <img :src="icons.edit" alt="edit" />
            </button>
          </div>
        </div>

        <div class="chat-view__header-right">
          <el-tooltip content="设置" placement="top">
            <button class="chat-view__action-btn" @click="settingDrawer.openDrawer()">
              <img :src="icons.settings" alt="settings" />
            </button>
          </el-tooltip>
          <el-tooltip content="回到首页" placement="top">
            <button class="chat-view__action-btn" @click="handleBack">
              <img :src="icons.back" alt="back" />
            </button>
          </el-tooltip>
        </div>
      </div>

      <!-- 消息容器，显示对话消息 -->
      <div class="chat-view__messages" ref="messagesContainer">
        <template v-if="currentMessages.length > 0">
          <ChatMessage
            v-for="(message, index) in currentMessages"
            :key="message.id"
            :message="message"
            :is-last-assistant-message="
              index === currentMessages.length - 1 && message.role === 'assistant'
            "
            @regenerate="handleRegenerate"
          />
        </template>
        <div v-else class="chat-view__empty">
          <div class="chat-view__empty-content">
            <img :src="icons.chat" alt="chat" class="chat-view__empty-icon" />
            <h2>开始对话吧</h2>
            <p>有什么想和我聊的吗？</p>
          </div>
        </div>
      </div>

      <!-- 聊天输入框 -->
      <div class="chat-view__input">
        <ChatInput :loading="isLoading" @send="handleSend" />
      </div>

      <!-- 设置面板 -->
      <SettingsPanel ref="settingDrawer" />

      <!-- 添加对话框组件 -->
      <DialogEdit ref="dialogEdit" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
/*
 * 聊天视图组件
 * 包含聊天头部、消息列表和输入框
 * 使用 BEM 命名规范
 * 采用绿色主题 - 主色：#4CAF50，浅色：#E8F5E9，深色：#2E7D32
 */

/* 聊天主容器 - 占满整个视口高度并使用弹性布局 */
.chat-container {
  display: flex;
  min-height: 100vh;
  background-color: #fafafa;
  position: relative;
  transition: margin-left 0.3s ease;

  /* 当侧边栏可见且为overlay模式时，将内容向右推 */
  &.sidebar-visible.sidebar-mode-overlay {
    margin-left: 300px; /* 侧边栏宽度 */
  }

  // /* 当侧边栏可见且为below-header模式时，调整消息容器宽度 */
  // &.sidebar-visible.sidebar-mode-below-header .chat-view__messages {
  //   padding-left: calc(300px + 1rem); /* 侧边栏宽度 + 原有内边距 */
  // }
}

.chat-view {
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fafefe;

  /* 聊天头部 - 顶部导航栏 */
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #ffffff;
    border-bottom: 1px solid #e8f5e9; /* 浅绿色边框 */
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.08); /* 轻微阴影提升层次感 */
    z-index: 10; /* 确保头部始终在顶层 */

    /* 头部左侧区域 - 包含菜单、新建按钮和标题 */
    &-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    /* 头部右侧区域 - 包含设置和返回按钮 */
    &-right {
      display: flex;
      gap: 0.75rem;
    }
  }

  /* 操作按钮 - 通用样式 */
  &__action-btn {
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    /* 按钮图标 */
    img {
      width: 1.25rem;
      height: 1.25rem;
      transition: all 0.2s ease;
    }

    /* 按钮悬停效果 */
    &:hover {
      background-color: rgba(76, 175, 80, 0.1); /* 浅绿色背景提供反馈 */
      transform: translateY(-2px); /* 轻微上浮增强交互感 */

      img {
        transform: scale(1.1); /* 图标轻微放大 */
      }
    }

    /* 按钮激活效果 */
    &:active {
      transform: translateY(0); /* 点击时恢复位置 */
    }
  }

  /* 新建对话按钮 - 胶囊形状 */
  &__new-chat-btn {
    /* 基础尺寸设置 */
    font-size: 0.85rem;
    height: 2.25rem;
    padding: 0 0.75rem;

    /* 文字垂直居中对齐 */
    display: inline-flex;
    align-items: center;
    line-height: 1;

    /* 圆角设置 - 胶囊形状 */
    border-radius: 9999px;

    /* 颜色设置 - 绿色主题 */
    border: 1px solid #4CAF50;
    background-color: #ffffff;
    color: #4CAF50;
    font-weight: 500;

    /* 过渡效果 */
    transition: all 0.3s ease;

    /* 悬停效果 */
    &:hover {
      background-color: #4CAF50;
      border-color: #43a047;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2); /* 添加阴影增强立体感 */
    }

    /* 图标样式 */
    :deep(.el-icon) {
      margin-right: 6px;
      font-size: 1rem;
      transition: transform 0.2s;
    }

    /* 悬停时图标旋转效果 */
    &:hover :deep(.el-icon) {
      transform: rotate(90deg); /* 图标旋转增强视觉趣味性 */
    }
  }

  /* 分隔线 */
  &__divider {
    height: 1.5rem;
    width: 1px;
    background-color: #c8e6c9; /* 浅绿色分隔线 */
    margin: 0 0.25rem;
  }

  /* 标题包装器 - 用于控制标题和编辑按钮的布局 */
  &__title-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    /* 标题区域悬停时显示编辑按钮 */
    &:hover {
      .chat-view__edit-btn {
        opacity: 1;
      }
    }
  }

  /* 对话标题 */
  &__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: #2e7d32; /* 深绿色文字 */
    max-width: 150px; /* 限制宽度 */
    overflow: hidden;
    text-overflow: ellipsis; /* 文本溢出显示省略号 */
    white-space: nowrap; /* 强制单行显示 */
  }

  /* 编辑按钮 - 初始隐藏 */
  &__edit-btn {
    opacity: 0;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    img {
      width: 100%;
      height: 100%;
      transition: transform 0.2s;
    }

    /* 悬停时图标旋转 */
    &:hover img {
      transform: rotate(15deg); /* 轻微旋转增强反馈 */
    }
  }

  /* 消息容器 - 显示对话消息的滚动区域 */
  &__messages {
    flex: 1; /* 占据剩余空间 */
    overflow-y: auto; /* 启用垂直滚动 */
    padding: 1rem; /* 四周内边距 */
    background-color: #f9fdf9; /* 极浅绿色背景 */

    /* 设置最大宽度和居中对齐，与输入框保持一致 */
    max-width: 800px;
    min-width: 0; /* 防止内容溢出 */
    margin: 0 auto;
    width: 100%;

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
      width: 6px;
      display: block;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(76, 175, 80, 0.2);
      border-radius: 3px;
      display: block;

      &:hover {
        background-color: rgba(76, 175, 80, 0.4);
      }
    }

    &::-webkit-scrollbar-track {
      background-color: transparent;
      display: block;
    }
  }

  /* 空状态 - 当没有消息时显示 */
  &__empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  /* 空状态内容 */
  &__empty-content {
    text-align: center;

    /* 空状态标题 */
    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #2e7d32; /* 深绿色文字 */
      margin-bottom: 0.75rem;
    }

    /* 空状态描述文字 */
    p {
      font-size: 1.1rem;
      color: #66bb6a; /* 中绿色文字 */
      margin: 0;
    }
  }

  /* 空状态图标 */
  &__empty-icon {
    width: 80px;
    height: 80px;
    opacity: 0.7;
    margin-bottom: 1.5rem;
    transition: transform 0.3s ease;

    /* 悬停时轻微放大并旋转 */
    &:hover {
      transform: scale(1.1) rotate(5deg);
      opacity: 0.9;
    }
  }

  /* 输入框容器 - 底部固定的消息输入区域 */
  &__input {
    position: sticky; /* 使用粘性定位，当滚动到底部时固定位置 */
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #ffffff;
    z-index: 10; /* 设置层级，确保输入框始终显示在其他内容之上 */
    padding: 0.75rem 1rem;
    border-top: 1px solid #e8f5e9; /* 浅绿色顶部边框 */
    box-shadow: 0 -2px 10px rgba(76, 175, 80, 0.05); /* 顶部阴影增强层次感 */

    /* 添加最大宽度和居中对齐 */
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  /* 顶部操作区 */
  &__actions {
    display: flex;
    gap: 12px;
  }

  /* 顶部操作按钮 */
  &__expand-btn {
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    /* 按钮图标 */
    :deep(.el-icon) {
      font-size: 1rem;
      transition: transform 0.2s;
    }

    /* 悬停效果 */
    &:hover {
      :deep(.el-icon) {
        transform: rotate(90deg); /* 图标旋转增强视觉趣味性 */
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-view {
    &__title {
      max-width: 120px;
    }
  }
}
</style>
