<script setup lang="ts">
import { ref, watchEffect, onMounted, nextTick, onUnmounted } from 'vue'
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

// 添加日志，监控props变化
watchEffect(() => {
  console.log('[TypeWriter] Props变化', {
    contentLength: props.content?.length,
    contentHash: props.content ? hashString(props.content.substring(0, 20)) : 'empty',
    isStreaming: props.isStreaming,
    isPaused: props.isPaused,
    isContentComplete: props.isContentComplete
  })
})

// 简单的字符串哈希函数，用于调试
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

const contentRef = ref<HTMLElement | null>(null)
let codeBlockObserver: MutationObserver | null = null

// 存储渲染结果
const renderedContent = ref('')
// 存储直接更新的内容
const directContent = ref('')

// 光标HTML
const CURSOR_HTML = '<span class="typewriter-cursor"></span>'
const CODE_CURSOR_HTML = '<span class="code-cursor"></span>'

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
        inCodeBlock = true
        languageSpecified = line.length > 3 && !!line.slice(3).trim()
      } else {
        inCodeBlock = false
      }
      return line
    }

    // 如果是最后一行且需要显示光标
    if (index === lines.length - 1 && props.isStreaming && !props.isContentComplete) {
      if (inCodeBlock) {
        // 在代码块内添加特殊标记
        return line + ' /* CURSOR_POSITION */'
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
  return html.replace(/\/\* CURSOR_POSITION \*\//g, CODE_CURSOR_HTML)
}

// 初始化代码块交互功能
const initializeCodeBlocks = () => {
  if (contentRef.value) {
    initializeAllCodeBlocks(contentRef.value)

    // 重置观察器
    if (codeBlockObserver) {
      codeBlockObserver.disconnect()
    }
    codeBlockObserver = createCodeBlockObserver(contentRef.value)
  }
}

// 监听流完成事件，直接更新内容
const handleStreamCompleted = (event: CustomEvent) => {
  const { content } = event.detail
  if (content) {
    console.log('[TypeWriter] 收到流完成事件，直接更新内容', content.length)
    // 直接渲染完整内容
    directContent.value = sanitizeHtml(md.render(content))

    // 在下一个DOM更新周期初始化代码块
    nextTick(() => {
      initializeCodeBlocks()
      console.log('[TypeWriter] 流完成后代码块初始化完成')
    })
  }
}

// 使用watchEffect处理渲染和代码块初始化
watchEffect(() => {
  // 如果有直接更新的内容，优先使用
  if (directContent.value) {
    renderedContent.value = directContent.value
    return
  }

  // 记录当前时间，用于性能分析
  const startTime = performance.now()

  // 根据当前状态渲染内容
  let html = ''

  if (!props.content) {
    html = ''
  } else if (!props.isStreaming || props.isContentComplete) {
    // 如果不是流式响应或内容已完成，直接渲染完整内容
    html = sanitizeHtml(md.render(props.content))
    console.log('[TypeWriter] 完整内容渲染', props.content.length)
  } else if (props.isPaused) {
    // 如果处于暂停状态
    if (props.isContentComplete) {
      // 如果内容已完全接收但处于暂停状态，不显示光标
      html = sanitizeHtml(md.render(props.content))
      console.log('[TypeWriter] 暂停状态，内容已完成', props.content.length)
    } else {
      // 暂停但内容未完全接收，显示光标
      const processed = processMarkdown(props.content)
      const rendered = md.render(processed)
      html = sanitizeHtml(replaceCursorMarker(rendered))
      console.log('[TypeWriter] 暂停状态，内容未完成', props.content.length)
    }
  } else {
    // 正常流式输出状态，显示光标
    const processed = processMarkdown(props.content)
    const rendered = md.render(processed)
    html = sanitizeHtml(replaceCursorMarker(rendered))
    console.log('[TypeWriter] 流式状态', props.content.length)
  }

  // 更新渲染内容
  renderedContent.value = html

  // 记录渲染时间
  const endTime = performance.now()
  console.log(`[TypeWriter] 渲染耗时: ${endTime - startTime}ms, 内容长度: ${props.content.length}, 渲染结果长度: ${html.length}`)

  // 在下一个DOM更新周期初始化代码块
  nextTick(() => {
    initializeCodeBlocks()
    console.log('[TypeWriter] 代码块初始化完成')
  })
})

onMounted(() => {
  // 组件挂载时初始化代码块（如果有内容）
  if (props.content) {
    nextTick(initializeCodeBlocks)
  }

  // 添加流完成事件监听
  window.addEventListener('stream-completed', handleStreamCompleted as EventListener)
})

onUnmounted(() => {
  // 组件卸载时清理观察器
  if (codeBlockObserver) {
    codeBlockObserver.disconnect()
    codeBlockObserver = null
  }

  // 移除事件监听
  window.removeEventListener('stream-completed', handleStreamCompleted as EventListener)
})
</script>

<template>
  <div class="typewriter">
    <div class="typewriter__content" ref="contentRef">
      <div class="markdown-content"
           v-html="renderedContent"
           :key="`content-${props.content.length}-${props.isContentComplete ? 'complete' : 'stream'}`">
      </div>
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
