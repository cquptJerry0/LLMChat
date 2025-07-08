<script setup lang="ts">
import TypeWriter from './TypeWriter.vue'
import ChatButton from '@/components/ChatButton.vue'
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  content: string
  reasoningContent?: string
  isStreaming?: boolean
  isError?: boolean
  isPaused?: boolean
  isContentComplete?: boolean
  isReasoningComplete?: boolean
  avatar: string
}>()


const emit = defineEmits<{
  (e: 'copy'): void
  (e: 'retry'): void
  (e: 'like', isLike: boolean): void
  (e: 'share'): void
  (e: 'pause'): void
  (e: 'resume'): void
}>()

const showCopyTip = ref(false)
const isLiked = ref(false)
const isDisliked = ref(false)

// 计算消息状态
const messageStatus = computed(() => {
  if (props.isError) return 'error'
  if (props.isPaused) {
    return props.isContentComplete ? 'content-complete' : 'paused'
  }
  if (props.isStreaming) return 'streaming'
  return 'complete'
})


const handleCopy = () => {
  emit('copy')
  showCopyTip.value = true
  setTimeout(() => {
    showCopyTip.value = false
  }, 1500)
}

const handleLike = (like: boolean) => {
  if (like) {
    isLiked.value = !isLiked.value
    if (isLiked.value) isDisliked.value = false
  } else {
    isDisliked.value = !isDisliked.value
    if (isDisliked.value) isLiked.value = false
  }
  emit('like', like)
}

const handleRetry = () => {
  emit('retry')
}

const handleShare = () => {
  emit('share')
}

const handlePause = () => {
  emit('pause')
}

const handleResume = () => {
  emit('resume')
}

// 监控 isReasoningComplete 属性变化
watch(() => props.isReasoningComplete, (newVal) => {
  console.log('[AssistantBubble] isReasoningComplete 属性变化:', newVal)
}, { immediate: true })

// 监控所有流状态属性
watch(() => ({
  isStreaming: props.isStreaming,
  isPaused: props.isPaused,
  isContentComplete: props.isContentComplete,
  isReasoningComplete: props.isReasoningComplete
}), (newState) => {
  console.log('[AssistantBubble] 流状态属性集合:', newState)
}, { deep: true, immediate: true })
</script>

<template>
  <div class="assistant-wrapper" :class="`assistant-wrapper--${messageStatus}`">
    <div class="assistant-avatar">
        <el-avatar
          :size="36"
          :src="avatar"
          shape="circle"
        />
    </div>

    <div class="assistant-container">
          <!-- 错误状态提示 -->
          <div v-if="isError" class="assistant-error">
            <el-alert
              title="生成出错"
              type="error"
              description="AI 助手生成回复时遇到错误，请点击重试按钮重新生成。"
              show-icon
              :closable="false"
              class="assistant-error__alert"
            />
          </div>

          <!-- 暂停状态提示 -->
          <div v-else-if="isPaused" class="assistant-paused">
            <el-alert
              :title="isContentComplete ? '内容已全部接收，生成已暂停' : '生成已暂停'"
              type="warning"
              :description="isContentComplete ? 'AI 助手已完成回复，但显示被暂停。点击下方按钮查看完整回复。' : 'AI 助手生成回复已暂停，点击下方继续生成按钮恢复。'"
              show-icon
              :closable="false"
              class="assistant-paused__alert"
            />
            <!-- 继续生成按钮 -->
            <div class="assistant-paused__actions">
              <ChatButton
                :icon="isContentComplete ? 'check' : 'play'"
                :type="isContentComplete ? 'primary' : 'success'"
                :tooltip="isContentComplete ? '显示完整回复 (Ctrl+R)' : '继续生成 (Ctrl+R)'"
                iconColor="var(--icon-color-secondary)"
                @click="handleResume"
              >
                {{ isContentComplete ? '显示完整回复' : '继续生成' }}
              </ChatButton>
            </div>
          </div>

          <!-- 推理内容 -->
          <div v-if="reasoningContent" class="assistant-reasoning">
            <div class="assistant-reasoning__title">推理过程：</div>
            <TypeWriter
              :content="reasoningContent"
              :is-streaming="isStreaming"
              :is-paused="isPaused"
              :is-content-complete="isReasoningComplete"
              role="reasoning"
              :key="`reasoning-${reasoningContent?.length || 0}-${isContentComplete || isReasoningComplete ? 'complete' : 'stream'}`"
            />
          </div>

          <!-- 主要内容 -->
      <div class="assistant-content">
          <TypeWriter
            :content="content"
            :is-streaming="isStreaming"
            :is-paused="isPaused"
            :is-content-complete="isContentComplete"
            role="content"
            :key="`content-${content.length}-${isContentComplete || isReasoningComplete ? 'complete' : 'stream'}`"
          />
        </div>

    <!-- 操作按钮 -->
    <div class="assistant-actions">
      <!-- 暂停/继续按钮 -->
      <ChatButton
        v-if="isStreaming"
        icon="pause"
        size="small"
        type="warning"
        tooltip="暂停生成 (Esc)"
        @click="handlePause"
      >
        暂停
      </ChatButton>
      <ChatButton
        :icon="showCopyTip ? 'check' : 'copy'"
        size="small"
        :class="{ 'button-completed': showCopyTip }"
        @click="handleCopy"
      >
        {{ showCopyTip ? '完成' : '复制' }}
      </ChatButton>
      <ChatButton
        icon="retry"
        size="small"
        :class="{ 'button-highlight': isError }"
        @click="handleRetry"
      >
        重试
      </ChatButton>
      <ChatButton
        icon="share"
        size="small"
        @click="handleShare"
      >
        分享
      </ChatButton>
      <ChatButton
        icon="like"
        size="small"
        tooltip="赞同"
        :class="{ 'button-liked': isLiked }"
        @click="handleLike(true)"
      />
      <ChatButton
        icon="dislike"
        size="small"
        tooltip="不赞同"
        :class="{ 'button-disliked': isDisliked }"
        @click="handleLike(false)"
      />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.assistant-wrapper {
  display: flex;
  width: 100%;
  padding: 10px 0;
  gap: 8px;
  background: #fff;

  &--error {
    .assistant-content {
      color: #f56c6c;
    }
  }

  &--streaming {
    border-bottom: 1px solid #409eff;
    }

  &--content-complete {
    border-bottom: 1px dashed #e6a23c;
  }
  }

.assistant-avatar {
  flex-shrink: 0;
  margin-left: 12px;
}

.assistant-container {
  flex-grow: 1;
  margin-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assistant-content {
  width: 100%;
  color: #000000E6;
  font-size: 16px;
  line-height: 1.8;
  font-family: -apple-system, BlinkMacSystem, sans-serif;
  min-height: 46px;
  display: flex;
  align-items: center;
}

.assistant-error,
.assistant-paused {
  margin-bottom: 6px;

  &__alert {
    margin-bottom: 0;
  }

  &__actions {
    display: flex;
    margin-top: 8px;
    justify-content: flex-start;
  }
}

.assistant-reasoning {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 13px;
  color: #00000073;

  &__title {
    font-weight: bold;
    margin-bottom: 4px;
  }
}

.assistant-actions {
  display: flex;
  gap: 6px;
  padding: 2px 0;
  opacity: 0;
  transition: opacity 0.2s ease;

  .assistant-wrapper:hover & {
    opacity: 1;
  }

  .assistant-wrapper--error & {
    opacity: 1;
  }

  .assistant-wrapper--streaming & {
    opacity: 1;
  }

  :deep(.chat-button) {
    height: 22px;
    border-radius: 3px;
    font-size: 12px;
    color: #00000073;
    background-color: transparent;

    &:hover {
      color: #000000E6;
      background-color: rgba(0, 0, 0, 0.04);
    }

    &.button-completed {
      opacity: 0.5;
      background-color: #67c23a;
      color: white;
    }

    &.button-liked {
      background-color: #67c23a;
      color: white;
      width: 22px;
      padding: 0;
    }

    &.button-disliked {
      background-color: #f56c6c;
      color: white;
      width: 22px;
      padding: 0;
    }

    &.button-highlight {
      background-color: #f56c6c;
      color: white;
    }

    .chat-button__icon {
      margin-right: 3px;
      font-size: 12px;
    }
  }
}

// 适配暗色主题
[data-theme="dark"] {
  .assistant-wrapper {
    background: #303841;
  }

  .assistant-content {
    color: #e0e0e0;
  }

  .assistant-reasoning {
    border-color: var(--chat-border-color);
  }
}
</style>
