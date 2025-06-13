<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { md, renderMarkdownWithCursor } from '@/utils/markdown'
import { DoubleBuffer } from '@/utils/DoubleBuffer'

// 定义 props
const props = defineProps<{
  content: string
  isStreaming?: boolean
  speed?: number
}>()

// 使用计算属性监听是否流式显示
const isStreaming = computed(() => props.isStreaming || false)

// 最终显示的文本
const displayText = ref('')

// 打字机效果是否完成
const isComplete = ref(false)

// 带光标的Markdown渲染
const renderedContent = computed(() => {
  if (!displayText.value) return ''

  // 如果不是流式响应或已完成，直接渲染
  if (!isStreaming.value || isComplete.value) {
    return md.render(displayText.value)
  }

  // 使用带光标的Markdown渲染
  return renderMarkdownWithCursor(displayText.value)
})

// 创建双缓冲区管理器
const doubleBuffer = new DoubleBuffer({
  updateInterval: 200,
  renderCallback: (content: string) => {
    displayText.value = content
  },
  debugMode: true // 调试模式
})

// 更新内容处理函数
const updateContent = (newContent: string) => {
  if (!newContent) return

  // 使用双缓冲区管理器处理内容更新
  doubleBuffer.updateContent(newContent, isStreaming.value)

  // 设置完成状态
  isComplete.value = doubleBuffer.isContentComplete()
}


// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (newContent) {
      updateContent(newContent)
    }
  },
  { immediate: true }
)

// 组件卸载时清理资源
onUnmounted(() => {
  doubleBuffer.destroy()
})
</script>

<template>
  <div class="typewriter">
    <div v-html="renderedContent" class="markdown-body"></div>
  </div>
</template>

<style scoped>
.typewriter {
  width: 100%;
  height: auto;
  overflow-wrap: break-word;
}
</style>
