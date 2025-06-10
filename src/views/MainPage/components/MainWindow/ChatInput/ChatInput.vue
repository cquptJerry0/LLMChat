<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConversationControlChild } from '@/composables/useConversationControl'
import ChatButton from '@/components/ChatButton.vue'
import ChatIcon from '@/components/ChatIcon.vue'

// 使用父组件提供的会话控制
const { state, messageActions } = useConversationControlChild()

// 输入框内容
const inputContent = ref('')
const textareaRows = ref(3)

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
            type="primary"
            :disabled="!inputContent.trim() || isGenerating"
            @click="sendMessage"
          >
            发送
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
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTZDMTIuNDE4MyAxNiAxNiAxMi40MTgzIDE2IDhDMTYgMy41ODE3MiAxMi40MTgzIDAgOCAwQzMuNTgxNzIgMCAwIDMuNTgxNzIgMCA4QzAgMTIuNDE4MyAzLjU4MTcyIDE2IDggMTZaTTggMTQuNUMxMS41ODk5IDE0LjUgMTQuNSAxMS41ODk5IDE0LjUgOEMxNC41IDQuNDEwMTUgMTEuNTg5OSAxLjUgOCAxLjVDNC40MTAxNSAxLjUgMS41IDQuNDEwMTUgMS41IDhDMS41IDExLjU4OTkgNC40MTAxNSAxNC41IDggMTQuNVpNOCA0QzguNDEwMjEgNCA4Ljc1IDQuMzM5NzkgOC43NSA0Ljc1VjcuMjVIMTEuMjVDMTEuNjYwMiA3LjI1IDEyIDcuNTg5NzkgMTIgOEMxMiA4LjQxMDIxIDExLjY2MDIgOC43NSAxMS4yNSA4Ljc1SDguNzVWMTEuMjVDOC43NSAxMS42NjAyIDguNDEwMjEgMTIgOCAxMkM3LjU4OTc5IDEyIDcuMjUgMTEuNjYwMiA3LjI1IDExLjI1VjguNzVINC43NUM0LjMzOTc5IDguNzUgNCA4LjQxMDIxIDQgOEM0IDcuNTg5NzkgNC4zMzk3OSA3LjI1IDQuNzUgNy4yNUg3LjI1VjQuNzVDNy4yNSA0LjMzOTc5IDcuNTg5NzkgNCA4IDRaIiBmaWxsPSIjMDAwMDAwNzMiLz4KPC9zdmc+Cg==') center/contain no-repeat;
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

  &__globe-icon {
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTZDMTIuNDE4MyAxNiAxNiAxMi40MTgzIDE2IDhDMTYgMy41ODE3MiAxMi40MTgzIDAgOCAwQzMuNTgxNzIgMCAwIDMuNTgxNzIgMCA4QzAgMTIuNDE4MyAzLjU4MTcyIDE2IDggMTZaTTggMTQuNUMxMS41ODk5IDE0LjUgMTQuNSAxMS41ODk5IDE0LjUgOEMxNC41IDQuNDEwMTUgMTEuNTg5OSAxLjUgOCAxLjVDNC40MTAxNSAxLjUgMS41IDQuNDEwMTUgMS41IDhDMS41IDExLjU4OTkgNC40MTAxNSAxNC41IDggMTQuNVpNOCA0QzguNDEwMjEgNCA4Ljc1IDQuMzM5NzkgOC43NSA0Ljc1VjcuMjVIMTEuMjVDMTEuNjYwMiA3LjI1IDEyIDcuNTg5NzkgMTIgOEMxMiA4LjQxMDIxIDExLjY2MDIgOC43NSAxMS4yNSA4Ljc1SDguNzVWMTEuMjVDOC43NSAxMS42NjAyIDguNDEwMjEgMTIgOCAxMkM3LjU4OTc5IDEyIDcuMjUgMTEuNjYwMiA3LjI1IDExLjI1VjguNzVINC43NUM0LjMzOTc5IDguNzUgNCA4LjQxMDIxIDQgOEM0IDcuNTg5NzkgNC4zMzk3OSA3LjI1IDQuNzUgNy4yNUg3LjI1VjQuNzVDNy4yNSA0LjMzOTc5IDcuNTg5NzkgNCA4IDRaIiBmaWxsPSIjMDAwMDAwIi8+Cjwvc3ZnPgo=') center/contain no-repeat;
  }

  &__link-icon {
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYuNSA0LjVDNi41IDMuMTE5MjkgNy42MTkyOSAyIDkgMkMxMC4zODA3IDIgMTEuNSAzLjExOTI5IDExLjUgNC41QzExLjUgNS44ODA3MSAxMC4zODA3IDcgOSA3QzcuNjE5MjkgNyA2LjUgNS44ODA3MSA2LjUgNC41Wk05IDMuNUM4LjQ0NzcyIDMuNSA4IDMuOTQ3NzIgOCA0LjVDOCA1LjA1MjI4IDguNDQ3NzIgNS41IDkgNS41QzkuNTUyMjggNS41IDEwIDUuMDUyMjggMTAgNC41QzEwIDMuOTQ3NzIgOS41NTIyOCAzLjUgOSAzLjVaTTQuNSA5QzQuNSA3LjYxOTI5IDUuNjE5MjkgNi41IDcgNi41QzguMzgwNzEgNi41IDkuNSA3LjYxOTI5IDkuNSA5QzkuNSAxMC4zODA3IDguMzgwNzEgMTEuNSA3IDExLjVDNS42MTkyOSAxMS41IDQuNSAxMC4zODA3IDQuNSA5Wk03IDhDNi40NDc3MiA4IDYgOC40NDc3MiA2IDlDNiA5LjU1MjI4IDYuNDQ3NzIgMTAgNyAxMEM3LjU1MjI4IDEwIDggOS41NTIyOCA4IDlDOCA4LjQ0NzcyIDcuNTUyMjggOCA3IDhaIiBmaWxsPSIjMDAwMDAwIi8+Cjwvc3ZnPgo=') center/contain no-repeat;
  }

  &__image-icon {
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIgNEMyIDIuODk1NDMgMiA0IDJIMTJDMTMuMTA0NiAyIDE0IDIuODk1NDMgMTQgNFYxMkMxNCAxMy4xMDQ2IDEzLjEwNDYgMTQgMTIgMTRIMjBDMi44OTU0MyAxNCAyIDEzLjEwNDYgMiAxMlY0Wk00IDEwSDUuNTg1N0w3LjI5MjkgOC4yOTI4OUM3LjY4MzQyIDcuOTAyMzcgOC4zMTY1OCA3LjkwMjM3IDguNzA3MTEgOC4yOTI4OUwxMiAxMS41ODU4VjRDMTIgNC41NTIyOCAxMS41NTIzIDUgMTEgNUg1QzQuNDQ3NzIgNSA0IDQuNTUyMjggNCA0VjEwWk00IDEyVjExLjQxNDJMOCA3LjQxNDIxTDEyIDExLjQxNDJWMTJDMTIgMTIuNTUyMyAxMS41NTIzIDEzIDExIDEzSDVDNC40NDc3MiAxMyA0IDEyLjU1MjMgNCAxMlpNNiA2QzYgNi41NTIyOCA2LjQ0NzcyIDcgNyA3QzcuNTUyMjggNyA4IDYuNTUyMjggOCA2QzggNS40NDc3MiA3LjU1MjI4IDUgNyA1QzYuNDQ3NzIgNSA2IDUuNDQ3NzIgNiA2WiIgZmlsbD0iIzAwMDAwMCIvPgo8L3N2Zz4K') center/contain no-repeat;
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
