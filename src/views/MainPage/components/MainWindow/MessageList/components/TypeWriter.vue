<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, onBeforeUnmount } from 'vue'
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
// 动画控制
const animationId = ref<number | null>(null)
const targetContent = ref('')

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

// 使用rAF实现平滑打字效果
const animateTyping = () => {
  // 如果还有内容要显示
  if (targetContent.value.length > displayText.value.length) {
    // 计算合适的增量大小，根据速度调整
    const baseSpeed = props.speed || 1
    const chunkSize = Math.max(1, Math.ceil(baseSpeed / 4))

    // 计算下一个位置
    const nextPos = Math.min(displayText.value.length + chunkSize, targetContent.value.length)

    // 更新显示的文本
    displayText.value = targetContent.value.substring(0, nextPos)

    // 如果还没显示完，继续动画
    if (displayText.value.length < targetContent.value.length) {
      animationId.value = requestAnimationFrame(animateTyping)
    } else {
      // 如果不是流式响应，标记为完成
      if (!props.isStreaming) {
        isComplete.value = true
      }
    }
  } else {
    // 内容已经全部显示
    if (!props.isStreaming) {
      isComplete.value = true
    }
  }
}

// 更新显示文本
const updateDisplayText = () => {
  if (!props.content) return

  // 保存目标内容
  targetContent.value = props.content

  // 如果不是流式响应，直接显示全部内容
  if (!props.isStreaming) {
    displayText.value = props.content
    isComplete.value = true
    return
  }

  // 对于流式响应，如果动画未开始或已结束，启动新动画
  if (animationId.value === null) {
    animationId.value = requestAnimationFrame(animateTyping)
  }
}

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (!newContent) return

    // 对于非流式内容直接更新
    if (!props.isStreaming) {
      displayText.value = newContent
      isComplete.value = true
      return
    }

    // 流式内容：更新目标，确保动画在运行
    targetContent.value = newContent
    if (animationId.value === null) {
      animationId.value = requestAnimationFrame(animateTyping)
    }
  },
  { immediate: true }
)

// 监听流式状态变化
watch(
  () => props.isStreaming,
  (isStreaming) => {
    // 如果从流式变为非流式，立即显示完整内容
    if (!isStreaming && props.content) {
      // 取消动画
      if (animationId.value !== null) {
        cancelAnimationFrame(animationId.value)
        animationId.value = null
      }
      displayText.value = props.content
      isComplete.value = true
    }
  }
)

// 组件挂载后处理内容
onMounted(() => {
  if (props.content) {
    updateDisplayText()
  }
})

// 组件卸载前清理动画
onBeforeUnmount(() => {
  if (animationId.value !== null) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
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
