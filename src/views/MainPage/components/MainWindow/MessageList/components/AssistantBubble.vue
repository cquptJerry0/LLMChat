<script setup lang="ts">
import { Bubble } from 'vue-element-plus-x'
import TypeWriter from './TypeWriter.vue'
import ChatButton from '@/components/ChatButton.vue'
import { ref } from 'vue'

const props = defineProps<{
  content: string
  reasoningContent?: string
  isStreaming?: boolean
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
  <div class="assistant-wrapper">
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
}

.assistant-bubble {
  max-width: 80%;

  :deep(.el-bubble) {
    background-color: transparent;
    border-radius: 4px 16px 16px 16px;
  }
}

.assistant-content {
  padding: $spacing-base;
  color: var(--chat-message-text);
  background-color: var(--chat-message-background);
  border-radius: 4px 16px 16px 16px;
  box-shadow: $box-shadow-light;

  :deep(.markdown-body) {
    background-color: transparent;
  }
}

.assistant-reasoning {
  margin-top: $spacing-base;
  padding-top: $spacing-base;
  border-top: 1px solid var(--chat-border-color);
  font-size: $font-size-small;
  color: var(--text-secondary);

  &__title {
    font-weight: bold;
    margin-bottom: $spacing-mini;
  }
}

.assistant-actions {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  opacity: 0;
  transition: opacity 0.2s ease;

  .assistant-wrapper:hover & {
    opacity: 1;
  }

  :deep(.chat-button) {
    height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    font-size: 12px;

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

    .chat-button__icon {
      margin-right: 4px;
    }
  }
}

// 适配暗色主题
[data-theme="dark"] {
  .assistant-content {
    background-color: var(--chat-message-background);
  }

  .assistant-reasoning {
    border-color: var(--chat-border-color);
  }
}
</style>
