<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import MarkdownRender from './MarkdownRender.vue'

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
// 打字机效果的索引
const index = ref(0)
// 上一次内容长度
const lastContentLength = ref(0)
// 是否正在进行打字机效果
const isTyping = ref(false)

// 更新显示文本
const updateDisplayText = async () => {
  if (!props.content) return

  // 如果不是流式响应，直接显示全部内容
  if (!props.isStreaming) {
    displayText.value = props.content
    isComplete.value = true
    return
  }

  // 如果是流式响应，但内容变化不大，直接更新
  if (props.content.length - lastContentLength.value < 5) {
    displayText.value = props.content
    lastContentLength.value = props.content.length
    return
  }

  // 如果正在进行打字机效果，不要开始新的效果
  if (isTyping.value) return

  isTyping.value = true

  try {
    // 如果内容长度增加了很多，从当前位置开始继续打字机效果
    if (index.value < props.content.length) {
      // 逐步更新显示内容
      while (index.value < props.content.length) {
        displayText.value = props.content.substring(0, index.value)
        index.value++

        // 每10个字符才暂停一下，加快渲染速度
        if (index.value % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, props.speed || 5))
        }
      }

      // 确保显示完整内容
      displayText.value = props.content
    }
  } finally {
    isTyping.value = false
    lastContentLength.value = props.content.length
    isComplete.value = index.value >= props.content.length
  }
}

// 监听内容变化
watch(
  () => props.content,
  (newContent, oldContent) => {
    if (!newContent) return

    // 如果内容没有变化，不做任何处理
    if (newContent === oldContent) return

    // 如果内容变化很小，直接更新
    if (newContent.length - lastContentLength.value < 5) {
      displayText.value = newContent
      lastContentLength.value = newContent.length
      return
    }

    // 如果内容发生了较大变化，重新开始打字机效果
    if (Math.abs(newContent.length - (oldContent?.length || 0)) > 50) {
      index.value = 0
      isComplete.value = false
      lastContentLength.value = 0
    }

    // 更新显示内容
    nextTick(() => updateDisplayText())
  }
)

// 组件挂载后开始打字机效果
onMounted(() => {
  if (props.content) {
    updateDisplayText()
  }
})
</script>

<template>
  <div class="typewriter">
    <div class="typewriter__content">
      <MarkdownRender :content="displayText" />
      <span v-if="isStreaming && !isComplete" class="typewriter__cursor">|</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.typewriter {
  &__content {
    position: relative;
  }

  &__cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background-color: currentColor;
    animation: blink 1s infinite;
    vertical-align: middle;
    margin-left: 2px;
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
