<script setup lang="ts">
import { Bubble } from 'vue-element-plus-x'
import TypeWriter from './TypeWriter.vue'
import ChatButton from '@/components/ChatButton.vue'
import { ref, computed } from 'vue'

const props = defineProps<{
  content: string
  reasoningContent?: string
  isStreaming?: boolean
  isError?: boolean
  isPaused?: boolean
  avatar: string
}>()

const emit = defineEmits<{
  (e: 'copy'): void
  (e: 'retry'): void
  (e: 'like', isLike: boolean): void
  (e: 'share'): void
}>()

const showCopyTip = ref(false)
const isLiked = ref(false)
const isDisliked = ref(false)

// 计算消息状态
const messageStatus = computed(() => {
  if (props.isError) return 'error'
  if (props.isPaused) return 'paused'
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
</script>

<template>
  <div class="assistant-wrapper" :class="`assistant-wrapper--${messageStatus}`">
    <Bubble
      :content="content"
      placement="start"
      variant="filled"
      :avatar="avatar"
      avatar-size="36px"
      shape="round"
      class="assistant-bubble"
    >
      <template #avatar>
        <el-avatar
          :size="36"
          :src="avatar"
          shape="circle"
        />
      </template>

      <template #content>
        <div class="assistant-content">
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
              title="生成已暂停"
              type="warning"
              description="AI 助手生成回复已暂停，您可以从流状态监控器中恢复生成。"
              show-icon
              :closable="false"
              class="assistant-paused__alert"
            />
          </div>

          <!-- 推理内容 -->
          <div v-if="reasoningContent" class="assistant-reasoning">
            <div class="assistant-reasoning__title">推理过程：</div>
            <TypeWriter
              :content="reasoningContent"
              :is-streaming="isStreaming"
            />
          </div>

          <!-- 主要内容 -->
          <TypeWriter
            :content="content"
            :is-streaming="isStreaming"
          />
        </div>
      </template>
    </Bubble>

    <!-- 操作按钮 -->
    <div class="assistant-actions">
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
</template>

<style lang="scss" scoped>
.assistant-wrapper {
  display: flex;
  flex-direction: column;
  gap: $spacing-small;
  width: 100%;

  &--error {
    .assistant-content {
      border: 1px solid var(--el-color-danger);
    }
  }

  &--paused {
    .assistant-content {
      border: 1px solid var(--el-color-warning);
    }
  }

  &--streaming {
    .assistant-content {
      border: 1px solid var(--el-color-primary);
    }
  }
}

.assistant-bubble {
  max-width: 780px;
  width: 100%;

  :deep(.el-bubble) {
    background-color: transparent;
    border-radius: 4px 16px 16px 16px;
  }
}

.assistant-content {
  padding: 12px 16px;
  color: #000000E6;
  background-color: #f0f6ff;
  border-radius: 4px 16px 16px 16px;
  box-shadow: none;
  font-size: 14px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystem, sans-serif;

  :deep(.markdown-body) {
    background-color: transparent;
    font-size: 14px;
    line-height: 1.6;
  }
}

.assistant-error,
.assistant-paused {
  margin-bottom: $spacing-base;

  &__alert {
    margin-bottom: 0;
  }
}

.assistant-reasoning {
  margin-top: $spacing-base;
  padding-top: $spacing-base;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 13px;
  color: #00000073;

  &__title {
    font-weight: bold;
    margin-bottom: $spacing-mini;
  }
}

.assistant-actions {
  display: flex;
  gap: 8px;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;

  .assistant-wrapper:hover & {
    opacity: 1;
  }

  .assistant-wrapper--error & {
    opacity: 1;
  }

  :deep(.chat-button) {
    height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #00000073;
    background-color: transparent;

    &:hover {
      color: #000000E6;
      background-color: rgba(0, 0, 0, 0.04);
    }

    &.button-completed {
      opacity: 0.5;
      background-color: var(--el-color-success);
      color: white;
    }

    &.button-liked {
      background-color: var(--el-color-success);
      color: white;
      width: 24px;
      padding: 0;
    }

    &.button-disliked {
      background-color: var(--el-color-danger);
      color: white;
      width: 24px;
      padding: 0;
    }

    &.button-highlight {
      background-color: var(--el-color-danger);
      color: white;
    }

    .chat-button__icon {
      margin-right: 4px;
    }
  }
}

// 适配暗色主题
[data-theme="dark"] {
  .assistant-content {
    background-color: #303841;
  }

  .assistant-reasoning {
    border-color: var(--chat-border-color);
  }
}
</style>
