<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { md } from '@/utils/markdown'
import { sanitizeHtml } from '@/utils/markdown/domPurify'
import { initializeAllCodeBlocks, createCodeBlockObserver } from '@/utils/markdown/codeBlock'

// 定义 props
const props = defineProps<{
  content: string
  isStreaming?: boolean
  isPaused?: boolean
  isContentComplete?: boolean
  speed?: number
}>()

// 显示的文本
const displayText = ref('')
// 打字机效果是否完成
const isComplete = ref(false)
// 光标类型
const CURSOR_HTML = '<span class="typewriter-cursor"></span>'
// 上次渲染的内容长度 - 用于判断何时触发优化
// 使用普通变量，而不是ref，避免响应式更新
let lastRenderedLength = 0

// 内容容器引用，用于代码块初始化
const contentRef = ref<HTMLElement | null>(null)
// 代码块观察器
let codeBlockObserver: MutationObserver | null = null

// 处理Markdown内容，在适当位置插入光标
const processMarkdown = (text: string): string => {
  if (!text) return ''

  // 分割文本为行
  const lines = text.split('\n')
  let inCodeBlock = false
  let languageSpecified = false

  // 处理每一行
  const processedLines = lines.map((line, index) => {
    // 检查是否是代码块开始或结束
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // 代码块开始，检查是否指定了语言
        inCodeBlock = true
        languageSpecified = line.length > 3 && !!line.slice(3).trim()
        return line
      } else {
        // 代码块结束
        inCodeBlock = false
        return line
      }
    }

    // 如果是最后一行且需要显示光标
    if (index === lines.length - 1 && props.isStreaming && !isComplete.value) {
      if (inCodeBlock) {
        // 在代码块内
        if (languageSpecified) {
          // 语言指定的代码块中添加特殊注释标记，以便后续替换
          return line + ' /* CURSOR_POSITION */'
        } else {
          // 没有语言的代码块，直接添加光标HTML
          return line + CURSOR_HTML
        }
      } else {
        // 不在代码块内，添加HTML光标
        return line + CURSOR_HTML
      }
    }

    return line
  })

  return processedLines.join('\n')
}

// 在渲染后的HTML中替换特殊标记为光标
const replaceCursorMarker = (html: string): string => {
  // 查找并替换注释标记
  return html.replace(
    /\/\* CURSOR_POSITION \*\//g,
    '<span class="code-cursor"></span>'
  )
}

// 带光标的Markdown渲染
const renderedContent = computed(() => {
  if (!displayText.value) return ''

  // 记录渲染状态，帮助调试
  console.log('TypeWriter渲染内容', {
    contentLength: displayText.value.length,
    isStreaming: props.isStreaming,
    isPaused: props.isPaused,
    isContentComplete: props.isContentComplete,
    isComplete: isComplete.value
  })

  // 如果不是流式响应或已完成，直接渲染
  if (!props.isStreaming || isComplete.value) {
    const rendered = md.render(displayText.value)
    // 使用DOMPurify净化输出
    return sanitizeHtml(rendered)
  }

  // 如果内容已完全接收但处于暂停状态，不显示光标
  if (props.isPaused && props.isContentComplete) {
    const rendered = md.render(displayText.value)
    return sanitizeHtml(rendered)
  }

  // 处理Markdown内容并渲染
  const processed = processMarkdown(displayText.value)
  const rendered = md.render(processed)

  // 替换特殊标记为光标并净化
  return sanitizeHtml(replaceCursorMarker(rendered))
})


// 更新显示文本
const updateDisplayText = () => {
  if (!props.content) return

  // 直接显示内容，保持同步
  displayText.value = props.content

  // 设置状态 - 简化逻辑：当不是流式或已暂停且内容完成时，标记为完成
  isComplete.value = !props.isStreaming || (props.isPaused && props.isContentComplete)
}

// 初始化代码块交互功能
const initializeCodeBlocks = () => {
  // 确保DOM已更新
  nextTick(() => {
    if (contentRef.value) {
      // 初始化所有现有代码块
      initializeAllCodeBlocks(contentRef.value)

      // 如果观察器已存在，先断开连接
      if (codeBlockObserver) {
        codeBlockObserver.disconnect()
      }

      // 创建新的观察器监视后续添加的代码块
      codeBlockObserver = createCodeBlockObserver(contentRef.value)
    }
  })
}

// 监听内容变化
watch(
  () => props.content,
  (newContent, oldContent) => {
    if (!newContent) return

    // 记录内容变化，帮助调试
    if (oldContent && newContent !== oldContent) {
      console.log('TypeWriter内容变化', {
        oldLength: oldContent.length,
        newLength: newContent.length,
        diff: newContent.length - oldContent.length,
        isStreaming: props.isStreaming,
        isPaused: props.isPaused,
        isContentComplete: props.isContentComplete
      })
    }

    // 同步更新显示内容
    displayText.value = newContent

    // 简化状态逻辑
    isComplete.value = !props.isStreaming || (props.isPaused && props.isContentComplete)

    // 内容变化后初始化代码块
    initializeCodeBlocks()
  },
  { immediate: true }
)

// 监听显示文本变化
watch(
  displayText,
  (newText) => {
    console.log('TypeWriter显示文本变化', {
      length: newText.length,
      isStreaming: props.isStreaming,
      isPaused: props.isPaused,
      isContentComplete: props.isContentComplete,
      isComplete: isComplete.value
    })

    // 每次显示文本变化时也初始化代码块
    nextTick(() => {
      initializeCodeBlocks()
    })
  }
)

// 监听组合状态变化
watch(
  () => ({
    isStreaming: props.isStreaming,
    isPaused: props.isPaused,
    isContentComplete: props.isContentComplete
  }),
  (newState) => {
    console.log('TypeWriter状态变化', newState)

    // 更新完成状态 - 简化逻辑
    isComplete.value = !newState.isStreaming || (newState.isPaused && newState.isContentComplete)

    // 状态变化后重新初始化代码块
    nextTick(() => {
      initializeCodeBlocks()
    })
  },
  { deep: true }
)

// 监听渲染内容变化，初始化新的代码块
watch(
  renderedContent,
  () => {
    // 等待DOM更新
    nextTick(() => {
      initializeCodeBlocks()
    })
  }
)

// 组件挂载后处理内容
onMounted(() => {
  if (props.content) {
    updateDisplayText()
    initializeCodeBlocks()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  if (codeBlockObserver) {
    codeBlockObserver.disconnect()
    codeBlockObserver = null
  }
})
</script>

<template>
  <div class="typewriter">
    <div class="typewriter__content" ref="contentRef">
      <div class="markdown-content" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<style lang="scss">
.typewriter {
  width: 100%;
  min-height: 100%;

  &__content {
    position: relative;
    width: 100%;
    min-height: 100%;
  }
}

.markdown-content {
  display: inline;
}

/* 普通文本中的光标 */
.typewriter-cursor {
  position: relative;
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 2px;
  margin-right: 2px;
  vertical-align: middle;
  background-color: #000;
  animation: cursor-pulse 1s infinite;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.05);
    animation: cursor-glow 1s infinite;
  }
}

/* 代码块中的光标 */
.code-cursor {
  display: inline-block;
  width: 2px;
  height: 0.9em;
  margin-left: 2px;
  margin-right: 1px;
  vertical-align: middle;
  background-color: currentColor;
  opacity: 0.8;
  animation: code-cursor-blink 1s infinite;
}

@keyframes cursor-pulse {
  0%, 100% {
    transform: scale(1);
    background: #000;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.4);
  }
  50% {
    transform: scale(0.85);
    background: #333;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  }
}

@keyframes cursor-glow {
  0%, 100% {
    opacity: 0.2;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.1;
    transform: translate(-50%, -50%) scale(1.4);
  }
}

@keyframes code-cursor-blink {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.3;
  }
}

</style>
