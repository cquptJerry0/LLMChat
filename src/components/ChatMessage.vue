<script setup lang="ts">
import { computed, ref, inject, onMounted, onUnmounted } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import { Document, ArrowDown } from '@element-plus/icons-vue'
import { icons } from '@/constants/icons'
import type { Message } from '@/types/chat'

// 注入对话控制和流控制
const conversationControl: any = inject('conversationControl')
const getStreamControl: any = inject('getStreamControl')

// 定义props
const props = defineProps({
  message: {
    type: Object as () => Message & {
      files?: Array<{
        type: string;
        url: string;
        name: string;
        size: number;
      }>;
    },
    required: true,
  },
  isLastAssistantMessage: {
    type: Boolean,
    default: false,
  },
  isUser: {
    type: Boolean,
    default: false,
  },
})

// 扩展 icons 类型以添加缺失的属性
const extendedIcons: any = icons

// 获取消息的流控制
const streamControl = computed(() => {
  if (getStreamControl && props.message.role === 'assistant') {
    return getStreamControl(props.message.id)
  }
  return null
})

// 流状态
const isPaused = computed(() => streamControl.value?.isPaused || false)
const isStreaming = computed(() => streamControl.value?.isStreaming || false)
const isError = computed(() => streamControl.value?.isError || false)

// 流控制方法
const handlePause = () => {
  if (streamControl.value) {
    streamControl.value.pause()
  }
}

const handleResume = () => {
  if (streamControl.value) {
    streamControl.value.resume((content: string, reasoning_content: string, completion_tokens: number, speed: number) => {
      // 回调函数由 useStreamControl 内部处理
      console.log('Message updating:', content)
    })
  }
}

const handleCancel = () => {
  if (streamControl.value) {
    streamControl.value.cancel()
  }
}

// 点赞和踩的状态
const isLiked = ref(false)
const isDisliked = ref(false)

// 添加复制状态
const isCopied = ref(false)

// 添加重新生成的事件
const emit = defineEmits(['regenerate'])

// 添加展开/折叠状态控制
const isReasoningExpanded = ref(true)

// 切换展开/折叠状态
const toggleReasoning = () => {
  isReasoningExpanded.value = !isReasoningExpanded.value
}

// 处理复制函数
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    isCopied.value = true

    // 1.5秒后恢复原始图标
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 处理点赞
const handleLike = () => {
  if (isDisliked.value) isDisliked.value = false
  isLiked.value = !isLiked.value
}

// 处理踩
const handleDislike = () => {
  if (isLiked.value) isLiked.value = false
  isDisliked.value = !isDisliked.value
}

// 添加重新生成的事件
const handleRegenerate = () => {
  emit('regenerate')
}

// 处理代码块的复制
const handleCodeCopy = async (event: Event) => {
  const codeBlock = (event.target as HTMLElement).closest('.code-block')
  if (!codeBlock) return

  const codeElement = codeBlock.querySelector('code')
  if (!codeElement) return

  const code = codeElement.textContent || ''

  try {
    await navigator.clipboard.writeText(code)
    // 可以添加复制成功的提示
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 处理代码块主题切换
const handleThemeToggle = (event: Event) => {
  const codeBlock = (event.target as HTMLElement).closest('.code-block')
  if (!codeBlock) return

  const themeIconElement = (event.target as HTMLElement).closest('[data-action="theme"]')?.querySelector('img')
  if (!themeIconElement) return

  const isDark = codeBlock.classList.contains('dark-theme')

  // 切换代码块主题
  codeBlock.classList.toggle('dark-theme')

  // 切换图标
  const themeIcon = themeIconElement as HTMLImageElement
  if (themeIcon.dataset.themeLight && themeIcon.dataset.themeDark) {
    themeIcon.src = isDark ? themeIcon.dataset.themeLight : themeIcon.dataset.themeDark
  }
}

// 修改事件监听的方式
onMounted(() => {
  // 使用 MutationObserver 来监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        const codeBlocks = document.querySelectorAll('.code-block')
        codeBlocks.forEach((block) => {
          const copyBtn = block.querySelector('[data-action="copy"]')
          const themeBtn = block.querySelector('[data-action="theme"]')

          if (copyBtn && !(copyBtn as any)._hasListener) {
            copyBtn.addEventListener('click', handleCodeCopy)
            ;(copyBtn as any)._hasListener = true
          }
          if (themeBtn && !(themeBtn as any)._hasListener) {
            themeBtn.addEventListener('click', handleThemeToggle)
            ;(themeBtn as any)._hasListener = true
          }
        })
      }
    })
  })

  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // 组件卸载时清理
  onUnmounted(() => {
    observer.disconnect()
    const codeBlocks = document.querySelectorAll('.code-block')
    codeBlocks.forEach((block) => {
      const copyBtn = block.querySelector('[data-action="copy"]')
      const themeBtn = block.querySelector('[data-action="theme"]')

      copyBtn?.removeEventListener('click', handleCodeCopy)
      themeBtn?.removeEventListener('click', handleThemeToggle)
    })
  })
})

// 将消息内容转换为 HTML
const renderedContent = computed(() => {
  return renderMarkdown(props.message.content)
})

// 添加 reasoning_content 的渲染
const renderedReasoning = computed(() => {
  if (!props.message.reasoning_content) return ''
  return renderMarkdown(props.message.reasoning_content)
})

// 判断消息是否正在加载
const isLoading = computed(() => {
  return isStreaming.value && props.message.role === 'assistant'
})
</script>

<template>
  <div class="chat-message" :class="{ 'is-user': isUser }">
    <div class="message-content">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/*
 * 聊天消息组件
 * 支持用户和机器人两种身份消息
 * 包含头像、用户名、消息内容和操作按钮
 * 使用 BEM 命名规范
 * 采用绿色主题 - 主色：#4CAF50，浅色：#E8F5E9，深色：#2E7D32
 */

.chat-message {
  /* 消息容器基础样式 */
  margin-bottom: 1.5rem; /* 增加消息间距 */
  position: relative;
  transition: transform 0.2s ease-out; /* 平滑过渡效果 */

  /* 用户信息样式 */
  &__user-info {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
  }

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 24px;
      height: 24px;
      object-fit: cover;
    }
  }

  &__name {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  /* 调整消息容器样式 */
  &--user {
    .chat-message__user-info {
      flex-direction: row-reverse;
    }
  }

  /* 用户身份的消息 - 靠右对齐 */
  &--user {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    /* 用户消息在加载完成时的动画效果 */
    &.loaded {
      animation: slideInRight 0.3s ease forwards;
    }

    .chat-message__content {
      background-color: #e8f5e9; /* 浅绿色背景 */
      color: #2e7d32; /* 深绿色文字提高对比度 */
      border-radius: 16px 4px 16px 16px; /* 特殊圆角标识用户消息 */
      box-shadow: 0 4px 8px rgba(76, 175, 80, 0.1); /* 绿色阴影 */

      /* 悬停时的阴影变化 */
      &:hover {
        box-shadow: 0 6px 12px rgba(76, 175, 80, 0.15); /* 增强阴影效果 */
      }

      /* 用户消息的代码块样式增强 */
      :deep(pre) {
        background-color: rgba(76, 175, 80, 0.1); /* 半透明绿色背景 */
        border-left: 4px solid #4caf50; /* 绿色左侧边框 */
      }
    }
  }

  /* 机器人身份的消息 - 靠左对齐 */
  &--bot {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    /* 机器人消息在加载完成时的动画效果 */
    &.loaded {
      animation: slideInLeft 0.3s ease forwards;
    }

    .chat-message__content {
      background-color: #ffffff; /* 白色背景 */
      color: #424242; /* 深灰色文字 */
      border-radius: 4px 16px 16px 16px; /* 特殊圆角标识机器人消息 */
      border-left: 3px solid #4caf50; /* 绿色左侧边框 */
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08); /* 轻微阴影 */

      /* 悬停时的阴影变化 */
      &:hover {
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12); /* 增强阴影效果 */
      }

      /* 机器人消息的引用块样式 */
      :deep(blockquote) {
        border-left-color: #4caf50; /* 绿色引用条 */
        background-color: #f1f8e9; /* 浅绿色背景 */
      }
    }
  }

  /* 等待响应的消息样式 */
  &--waiting {
    opacity: 0.7; /* 降低透明度 */
  }

  /* 消息内容区域 */
  &__content {
    padding: 12px 16px;
    max-width: 90%;
    word-break: break-word;
    border-radius: 16px;
    transition: all 0.3s ease;
    line-height: 1.6;
    font-size: 15px;
    margin-top: 0.25rem;
    position: relative;
  }

  /* 文件区域样式 */
  &__files {
    margin-bottom: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* 文件项样式 */
  &__file {
    position: relative;
  }

  /* 图片文件样式 */
  &__file-image {
    width: 70px;
    height: 70px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #e8f5e9;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  /* 文档文件样式 */
  &__file-document {
    padding: 10px 14px;
    background-color: #f1f8e9;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #c8e6c9;
  }

  /* 文件名称 */
  &__file-name {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #2e7d32;
    font-weight: 500;
  }

  /* 文件大小 */
  &__file-size {
    color: #66bb6a;
    font-size: 12px;
  }

  /* 思考中状态 */
  &__thinking {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 8px;
    color: #66bb6a;
    font-size: 14px;

    &-icon {
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }
  }

  /* 思考折叠按钮 */
  &__reasoning-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    margin-bottom: 8px;
    background-color: #f1f8e9;
    border-radius: 8px;
    cursor: pointer;
    width: fit-content;
    transition: background-color 0.2s;

    &:hover {
      background-color: #e8f5e9;
    }

    &-icon {
      width: 16px;
      height: 16px;
    }

    &-text {
      color: #2e7d32;
      font-size: 14px;
      font-weight: 500;
    }

    &-arrow {
      color: #4caf50;
      transition: transform 0.2s;

      &--expanded {
        transform: rotate(180deg);
      }
    }
  }

  /* 推理内容区域 */
  &__reasoning {
    margin-bottom: 12px;
    padding: 10px 14px;
    background-color: #f9fdf9;
    border-left: 3px solid #a5d6a7;
    border-radius: 4px;
    color: #555;
    font-size: 14px;
  }

  /* 消息气泡 */
  &__bubble {
    width: 100%;
  }

  /* 操作按钮容器 */
  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding-left: 8px;

    /* 消息操作按钮样式 */
    &-info {
      font-size: 12px;
      color: #78909c;
      padding: 3px 6px;
      background-color: #f1f8e9;
      border-radius: 4px;
    }
  }

  /* 操作按钮基础样式 */
  &__action-button {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: #e8f5e9;
    border: 1px solid #c8e6c9;
    transition: all 0.2s ease;

    /* 按钮图标 */
    &-icon {
      width: 1rem;
      height: 1rem;
      transition: transform 0.2s ease;
    }

    /* 按钮悬停效果 */
    &:hover {
      background-color: #4caf50;
      border-color: #4caf50;
      transform: translateY(-2px);
      box-shadow: 0 3px 8px rgba(76, 175, 80, 0.3);

      .chat-message__action-button-icon {
        transform: scale(1.1);
        filter: brightness(2);
      }
    }

    /* 按钮点击效果 */
    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 3px rgba(76, 175, 80, 0.2);
    }
  }
}

/* 旋转动画 - 用于加载图标 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 消息加载动画 */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(1rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-1rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-message {
    &__content {
      max-width: 95%; /* 移动设备上增加宽度 */
      padding: 10px 14px; /* 略微减小填充 */
      font-size: 14px; /* 减小字体大小 */
    }
  }
}
</style>
