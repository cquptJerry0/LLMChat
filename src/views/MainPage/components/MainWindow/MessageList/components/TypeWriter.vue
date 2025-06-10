<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { md } from '@/utils/markdown'

// 定义 props
const props = defineProps<{
  content: string
  isStreaming?: boolean
  speed?: number
}>()

// 显示的文本
const displayText = ref('')
// 打字机效果是否完成
const isComplete = ref(false)
// 光标类型
const CURSOR_HTML = '<span class="typewriter-cursor"></span>'

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

  // 如果不是流式响应或已完成，直接渲染
  if (!props.isStreaming || isComplete.value) {
    return md.render(displayText.value)
  }

  // 处理Markdown内容并渲染
  const processed = processMarkdown(displayText.value)
  const rendered = md.render(processed)

  // 替换特殊标记为光标
  return replaceCursorMarker(rendered)
})

// 更新显示文本
const updateDisplayText = async () => {
  if (!props.content) return

  // 如果不是流式响应，直接显示全部内容
  if (!props.isStreaming) {
    displayText.value = props.content
    isComplete.value = true
    return
  }

  // 流式响应，显示内容，保持未完成状态
  displayText.value = props.content
  isComplete.value = false
}

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (!newContent) return
    displayText.value = newContent
    isComplete.value = !props.isStreaming
  }
)

// 组件挂载后处理内容
onMounted(() => {
  if (props.content) {
    updateDisplayText()
  }
})
</script>

<template>
  <div class="typewriter">
    <div class="typewriter__content">
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
