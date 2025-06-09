<script setup>
import { ref, watch, nextTick } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { messageHandler } from '@/utils/messageHandler'
import { createChatCompletion } from '@/utils/api'
import { useSettingStore } from '@/stores/setting'

const searchText = ref('')
const messages = ref([])
const isLoading = ref(false)
const settingStore = useSettingStore()

// 模拟一个初始的 AI 消息
const aiMessage = 'Hi, 我是你的AI小助手，有什么问题都可以问我！'

// 模拟建议的提示词
const suggestedPrompts = [
  '如何快速上手Vue3框架',
  '入职字节跳动难吗？',
  '前端如何实现弹性布局',
  '喝酒脸红是会喝酒的表现吗？',
]

// 获取消息容器
const messagesContainer = ref(null)

// 监听消息变化，滚动到底部
watch(
  messages,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
  { deep: true },
)

// 处理发送消息
const handleSend = async () => {
  if (!searchText.value.trim() || isLoading.value) return

  try {
    // 设置loading状态
    isLoading.value = true

    // 添加用户消息
    messages.value.push(messageHandler.formatMessage('user', searchText.value.trim()))
    messages.value.push(messageHandler.formatMessage('assistant', '', '')) // 添加空的 reasoning_content

    // 获取最后一条消息
    const lastMessage = messages.value[messages.value.length - 1]
    lastMessage.loading = true

    // 清空输入框
    searchText.value = ''

    // 调用API获取回复
    const messagesForAPI = messages.value.map(({ role, content }) => ({ role, content }))
    const response = await createChatCompletion(messagesForAPI)

    // 使用封装的响应处理函数
    await messageHandler.handleResponse(
      response,
      settingStore.settings.stream,
      (content, reasoning_content, tokens, speed) => {
        // 添加 reasoning_content 参数
        lastMessage.content = content
        lastMessage.reasoning_content = reasoning_content // 更新 reasoning_content
        lastMessage.completion_tokens = tokens
        lastMessage.speed = speed
      },
    )
  } catch (error) {
    console.error('Failed to send message:', error)
    const lastMessage = messages.value[messages.value.length - 1]
    lastMessage.content = '抱歉，发生了一些错误，请稍后重试。'
  } finally {
    // 重置loading状态
    isLoading.value = false
    const lastMessage = messages.value[messages.value.length - 1]
    lastMessage.loading = false
  }
}

// 处理重新生成
const handleRegenerate = async () => {
  try {
    // 获取最后一条用户消息
    const lastUserMessage = messages.value[messages.value.length - 2]
    // 删除最后两条消息（用户消息和AI回复）
    messages.value.splice(-2, 2)
    // 重新发送最后一条用户消息，但使用新的 id
    const newUserMessage = {
      ...messageHandler.formatMessage('user', lastUserMessage.content),
      id: Date.now(),
    }
    messages.value.push(newUserMessage)
    messages.value.push({
      ...messageHandler.formatMessage('assistant', '', ''), // 添加空的 reasoning_content
      id: Date.now() + 1,
    })

    // 获取最后一条消息
    const lastMessage = messages.value[messages.value.length - 1]
    lastMessage.loading = true

    // 调用API获取回复
    const messagesForAPI = messages.value.map(({ role, content }) => ({ role, content }))
    const response = await createChatCompletion(messagesForAPI)

    // 使用封装的响应处理函数
    await messageHandler.handleResponse(
      response,
      settingStore.settings.stream,
      (content, reasoning_content, tokens, speed) => {
        // 添加 reasoning_content 参数
        lastMessage.content = content
        lastMessage.reasoning_content = reasoning_content // 更新 reasoning_content
        lastMessage.completion_tokens = tokens
        lastMessage.speed = speed
      },
    )
  } catch (error) {
    console.error('Failed to regenerate message:', error)
    const lastMessage = messages.value[messages.value.length - 1]
    lastMessage.content = '抱歉，发生了一些错误，请稍后重试。'
  } finally {
    const lastMessage = messages.value[messages.value.length - 1]
    lastMessage.loading = false
  }
}
</script>

<template>
  <div class="search-dialog">
    <div class="search-dialog__header">
      <div class="search-dialog__input">
        <input
          type="text"
          v-model="searchText"
          placeholder="提问"
          autofocus
          @keydown.enter.prevent="handleSend"
        />
        <button class="search-dialog__button" @click="handleSend" :disabled="isLoading">
          <img src="@/assets/photo/回车.png" alt="enter" />
        </button>
      </div>
    </div>

    <!-- 对话内容部分 -->
    <div class="search-dialog__content" ref="messagesContainer">
      <template v-if="messages.length === 0">
        <!-- 初始 AI 消息 -->
        <div class="search-dialog__welcome">
          {{ aiMessage }}
        </div>

        <!-- 建议提示词 -->
        <div class="search-dialog__suggestions">
          <div class="search-dialog__suggestions-title">建议提示词</div>
          <div class="search-dialog__suggestions-list">
            <button
              v-for="prompt in suggestedPrompts"
              :key="prompt"
              class="search-dialog__suggestions-item"
              @click="searchText = prompt"
            >
              {{ prompt }}
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 对话消息列表 -->
        <ChatMessage
          v-for="(message, index) in messages"
          :key="message.id"
          :message="message"
          :is-last-assistant-message="index === messages.length - 1 && message.role === 'assistant'"
          @regenerate="handleRegenerate"
        />
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/*
 * 搜索对话组件
 * 用于用户与AI助手的即时对话
 * 使用 BEM 命名规范: search-dialog 作为块名
 */

.search-dialog {
  max-width: 640px; /* 设置最大宽度，确保在大屏幕上内容不会过宽 */
  min-width: 320px; /* 设置最小宽度，确保在小屏幕上不会过窄 */
  max-height: 600px; /* 设置最大高度，保持界面紧凑 */
  background: #fff; /* 白色背景，干净清爽 */
  border-radius: 8px; /* 圆角边框，现代UI风格 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 轻微阴影，提供立体感 */
  overflow: hidden; /* 隐藏溢出内容，保持边界整洁 */
  display: flex; /* 使用弹性布局实现垂直结构 */
  flex-direction: column; /* 垂直排列各部分 */

  /* 搜索框头部区域 */
  &__header {
    flex-shrink: 0; /* 防止头部在空间不足时被压缩 */
    padding: 12px; /* 内边距，给内容留出呼吸空间 */
    border-bottom: 1px solid #eaeaea; /* 浅色边框，轻微分隔头部和内容 */
  }

  /* 搜索输入框容器 */
  &__input {
    width: 100%; /* 宽度占满容器 */
    height: 40px; /* 固定高度，易于交互 */
    padding: 0 12px; /* 水平内边距，文字不贴边 */
    display: flex; /* 使用弹性布局使输入框和按钮水平排列 */
    align-items: center; /* 垂直居中对齐 */
    position: relative; /* 创建定位上下文，用于按钮定位 */

    /* 输入框样式 */
    input {
      flex: 1; /* 输入框占据剩余空间 */
      height: 100%; /* 高度占满容器 */
      border: none; /* 无边框，简洁风格 */
      outline: none; /* 移除焦点轮廓，保持简洁 */
      background: none; /* 透明背景 */
      font-size: 1rem; /* 字体大小适中，易读 */
      color: #000; /* 黑色文字，最大对比度 */
      padding-right: 40px; /* 右侧留出空间给按钮 */

      /* 占位符样式 */
      &::placeholder {
        color: #999; /* 浅灰色，区别于输入文本 */
      }
    }
  }

  /* 发送按钮 */
  &__button {
    position: absolute; /* 绝对定位，精确放置 */
    right: 8px; /* 靠右对齐 */
    top: 50%; /* 垂直居中 */
    transform: translateY(-50%); /* 精确垂直居中 */
    width: 28px; /* 固定宽度，易点击 */
    height: 28px; /* 固定高度，保持正方形 */
    border: none; /* 无边框 */
    background: none; /* 透明背景 */
    padding: 0; /* 无内边距 */
    cursor: pointer; /* 鼠标手型，提示可点击 */
    border-radius: 6px; /* 圆角边框 */
    display: flex; /* 弹性布局居中图标 */
    align-items: center; /* 垂直居中 */
    justify-content: center; /* 水平居中 */
    transition: background-color 0.3s; /* 背景色过渡效果 */

    /* 按钮图标 */
    img {
      width: 16px; /* 图标宽度适中 */
      height: 16px; /* 保持图标比例 */
    }

    /* 按钮悬停效果 */
    &:hover {
      background-color: rgba(0, 0, 0, 0.05); /* 浅灰背景，提供视觉反馈 */
    }

    /* 禁用状态 */
    &:disabled {
      opacity: 0.5; /* 降低透明度 */
      cursor: not-allowed; /* 禁止鼠标样式 */
    }
  }

  /* 对话内容区域 */
  &__content {
    flex: 1; /* 占据剩余空间，允许内容区域伸展 */
    padding: 12px; /* 内边距，内容不贴边 */
    overflow-y: auto; /* 允许垂直滚动，处理溢出内容 */
    display: flex; /* 使用弹性布局组织消息 */
    flex-direction: column; /* 垂直排列消息 */
    gap: 16px; /* 消息之间的间距 */
  }

  /* 欢迎消息 */
  &__welcome {
    padding: 12px; /* 内边距，文字不贴边 */
    color: #000; /* 黑色文字，易读 */
    font-size: 14px; /* 字体大小适中 */
    line-height: 1.5; /* 行高适中，增强可读性 */
    display: flex; /* 弹性布局 */
    align-items: center; /* 垂直居中 */
  }

  /* 建议提示词容器 */
  &__suggestions {
    margin-top: 24px; /* 与欢迎消息保持距离 */
    display: flex; /* 弹性布局 */
    flex-direction: column; /* 垂直排列 */
    gap: 12px; /* 元素之间的间距 */

    /* 提示词标题 */
    &-title {
      padding-left: 12px; /* 左侧内边距 */
      font-size: 12px; /* 小字体，次要信息 */
      color: #666; /* 中灰色，不抢眼 */
    }

    /* 提示词列表 */
    &-list {
      display: flex; /* 弹性布局 */
      flex-direction: column; /* 垂直排列提示词 */
      gap: 8px; /* 提示词之间的间距 */
    }

    /* 单个提示词项目 */
    &-item {
      text-align: left; /* 文字左对齐 */
      padding: 8px 12px; /* 内边距，文字不贴边 */
      background: none; /* 透明背景 */
      border: none; /* 无边框 */
      border-radius: 6px; /* 圆角边框 */
      font-size: 14px; /* 字体大小适中 */
      color: #000; /* 黑色文字，易读 */
      cursor: pointer; /* 鼠标手型，提示可点击 */
      transition: background-color 0.2s; /* 背景色过渡效果 */
      display: flex; /* 弹性布局 */
      align-items: center; /* 垂直居中 */

      /* 悬停效果 */
      &:hover {
        background-color: #f5f5f5; /* 浅灰背景，提供视觉反馈 */
      }
    }
  }
}
</style>
