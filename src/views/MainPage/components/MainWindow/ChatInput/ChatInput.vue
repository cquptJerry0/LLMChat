<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ChatButton from '@/components/ChatButton.vue'
import { useStreamControl } from '@/composables/useStreamControl'
// 使用父组件提供的会话控制
const { state, messageActions } = useConversationControlChild()

// 输入框内容
const inputContent = ref('')
const textareaRows = ref(3)

// 图标样式
const started = ref(false)
// 监听输入内容变化，自动调整行数
watch(inputContent, (newValue) => {
  // 计算换行符数量
  const lineBreaks = (newValue.match(/\n/g) || []).length
  // 根据内容自动调整行数，最小3行，最大10行
  textareaRows.value = Math.max(3, Math.min(10, lineBreaks + 1))
})

// 是否正在生成
const isGenerating = computed(() => {
  return state.value.isGenerating
})

// 按钮图标和文本
const buttonProps = computed(() => {
  if (isGenerating.value) {
    return {
      icon: 'stop',
      text: '停止生成'
    }
  }
  return {
    icon: 'send',
    text: '发送'
  }
})

// 处理按钮点击
const handleClick = () => {
  if (isGenerating.value) {
    // 如果正在生成，则取消生成
    if (state.value.lastAssistantMessageId) {
      useStreamControl(state.value.lastAssistantMessageId).cancel()
    }
  } else {
    // 如果没有生成，则发送消息
    sendMessage()
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputContent.value.trim() || isGenerating.value) return

  const content = inputContent.value
  inputContent.value = ''
  textareaRows.value = 3 // 重置行数

  await messageActions.send(content)
}

// 处理按键事件
const handleKeyDown = (event: KeyboardEvent) => {
  // 按下 Ctrl+Enter 发送消息
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="chat-input">
    <div class="chat-input__container">
      <!-- 输入框 -->
      <div class="chat-input__textarea-container">
        <el-input
          v-model="inputContent"
          type="textarea"
          :rows="textareaRows"
          :placeholder="isGenerating ? '正在生成回复...' : '随时@你想要的 Kimi+ 使用各种能力'"
          :disabled="isGenerating"
          resize="none"
          @keydown="handleKeyDown"
        />
      </div>

      <!-- 底部工具栏 -->
      <div class="chat-input__toolbar">
        <div class="chat-input__tools">
          <el-tooltip content="长度参考" placement="top">
            <div class="chat-input__length">
              <i class="chat-input__length-icon" />
              <span>k1.5</span>
            </div>
          </el-tooltip>
          <el-tooltip content="全球" placement="top">
            <i class="chat-input__globe-icon" />
          </el-tooltip>
          <el-tooltip content="链接" placement="top">
            <i class="chat-input__link-icon" />
          </el-tooltip>
          <el-tooltip content="图片" placement="top">
            <i class="chat-input__image-icon" />
          </el-tooltip>
        </div>
        <div class="chat-input__send">
          <ChatButton
            :type="isGenerating ? 'danger' : 'primary'"
            :disabled="!inputContent.trim() && !isGenerating"
            @click="handleClick"
            :icon="buttonProps.icon"
          >
            {{ buttonProps.text }}
          </ChatButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-input {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  background-color: #fff;

  &__container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    background-color: #fff;
    width: 100%;
    max-width: 768px;
    margin: 0 auto;
    border-radius: 8px;
  }

  &__textarea-container {
    width: 100%;
    background: #fff;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(0, 0, 0, 0.1);
    }

    &:focus-within {
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
    }

    :deep(.el-textarea__inner) {
      min-height: 46px;
      padding: 11px 16px;
      resize: none;
      border: none;
      background-color: transparent;
      transition: none;
      font-size: 14px;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystem, sans-serif;
      color: #000000E6;

      &::placeholder {
        color: #00000073;
      }

      &:focus {
        box-shadow: none;
      }
    }
  }

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
    height: 32px;
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__length {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #00000073;
    cursor: help;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    &-icon {
      width: 16px;
      height: 16px;
    }
  }

  &__globe-icon,
  &__link-icon,
  &__image-icon {
    width: 16px;
    height: 16px;
    cursor: pointer;
    opacity: 0.45;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.85;
    }
  }

  :deep(.chat-button) {
    height: 32px;
    padding: 0 16px;
    border-radius: 6px;
    font-size: 14px;

    &.el-button--primary {
      background-color: #1677ff;

      &:hover {
        background-color: #4096ff;
      }

      &:active {
        background-color: #0958d9;
      }
    }
  }
}
</style>
