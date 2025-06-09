<script setup lang="ts">
import { ref, nextTick, inject } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { icons } from '@/constants/icons'

// 注入对话控制
const conversationControl: any = inject('conversationControl')

// 输入框的值，使用 ref 实现响应式
const inputValue = ref('')
const fileList = ref<any[]>([]) // 存储上传的文件列表

// 定义组件的 props，接收 loading 状态
const props = defineProps({
  loading: {
    type: Boolean, // loading 的类型为布尔值
    default: false, // 默认值为 false
  },
})

// 定义组件的事件，这里声明了一个 send 事件
const emit = defineEmits(['send'])

// 输入框引用
const inputRef = ref(null)

// 处理发送消息的方法
const handleSend = async () => {
  if (props.loading || (!inputValue.value.trim() && fileList.value.length === 0)) {
    return
  }

  try {
    // 使用 conversationControl 发送消息
    if (conversationControl) {
      await conversationControl.sendMessage(inputValue.value.trim())
    }

    // 触发事件，让父组件知道消息已发送
    emit('send', {
      content: inputValue.value.trim(),
      files: fileList.value
    })

    // 清空输入框和文件列表
    inputValue.value = ''
    fileList.value = []
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}

// 处理换行的方法（Shift + Enter）
const handleNewline = (e: KeyboardEvent) => {
  e.preventDefault() // 阻止默认的 Enter 发送行为
  inputValue.value += '\n' // 在当前位置添加换行符

  // 使用 nextTick 确保在 DOM 更新后设置光标位置
  nextTick(() => {
    if (inputRef.value) {
      const textarea = (inputRef.value as any).$el.querySelector('textarea')
      if (textarea) {
        textarea.focus()
      }
    }
  })
}

// 定义文件对象类型
interface FileObject {
  name: string;
  size: number;
  type: 'image' | 'document';
  url: string;
  raw: File;
}

// 处理文件上传
const handleFileUpload = (file: any) => {
  // 检查文件类型
  const isImage = file.raw.type.startsWith('image/')

  // 创建文件对象
  const fileObj: FileObject = {
    name: file.name,
    size: file.size,
    type: isImage ? 'image' : 'document',
    url: URL.createObjectURL(file.raw),
    raw: file.raw
  }

  // 添加到文件列表
  fileList.value.push(fileObj)

  return false // 阻止自动上传
}

// 移除文件
const handleFileRemove = (file: FileObject) => {
  const index = fileList.value.findIndex(f => f.url === file.url)
  if (index !== -1) {
    // 释放 URL 对象
    URL.revokeObjectURL(fileList.value[index].url)
    // 从列表中移除
    fileList.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="chat-input">
    <!-- 文件预览区域 -->
    <div v-if="fileList.length > 0" class="chat-input__files">
      <div v-for="(file, index) in fileList" :key="index" class="chat-input__file">
        <!-- 图片预览 -->
        <div v-if="file.type === 'image'" class="chat-input__file-image">
          <img :src="file.url" :alt="file.name" />
        </div>
        <!-- 文件预览 -->
        <div v-else class="chat-input__file-document">
          <el-icon><Document /></el-icon>
          <span class="chat-input__file-name">{{ file.name }}</span>
          <span class="chat-input__file-size">{{ (file.size / 1024).toFixed(1) }}KB</span>
        </div>
        <!-- 删除按钮 -->
        <button class="chat-input__file-delete" @click="handleFileRemove(file)">
          <img :src="icons.delete" alt="delete" />
        </button>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input__wrapper">
      <el-input
        ref="inputRef"
        v-model="inputValue"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 6 }"
        class="chat-input__textarea"
        :class="{ 'chat-input__textarea--disabled': props.loading }"
        :placeholder="props.loading ? '请等待回复完成...' : '输入消息...'"
        :disabled="props.loading"
        resize="none"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.enter.shift.exact="handleNewline"
      />
    </div>

    <!-- 操作按钮区域 -->
    <div class="chat-input__actions">
      <el-upload
        class="chat-input__upload"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileUpload"
        accept=".pdf,.doc,.docx,.txt"
      >
        <button class="chat-input__button">
          <img :src="icons.attachment" alt="link" />
        </button>
      </el-upload>
      <el-upload
        class="chat-input__upload"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileUpload"
        accept="image/*"
      >
        <button class="chat-input__button">
          <img :src="icons.image" alt="picture" />
        </button>
      </el-upload>
      <div class="chat-input__divider"></div>
      <button class="chat-input__button chat-input__button--send" :disabled="props.loading" @click="handleSend">
        <img :src="icons.send" alt="send" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/*
 * 聊天输入组件
 * 包含文件预览、输入框和操作按钮
 * 使用 BEM 命名规范
 * 采用绿色主题 - 主色：#4CAF50，浅色：#E8F5E9，深色：#2E7D32
 */

.chat-input {
  /* 基础样式 */
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;

  /* 悬停效果 */
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  /* 聚焦效果 */
  &:focus-within {
    border-color: #4caf50;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
  }

  /* 文件预览区域 */
  &__files {
    margin-bottom: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* 预览项容器 */
  &__file {
    position: relative; /* 为删除按钮提供定位上下文 */
    border-radius: 10px;
    overflow: hidden; /* 确保内容不溢出圆角 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;

    /* 悬停效果 */
    &:hover {
      transform: translateY(-2px);
    }
  }

  /* 图片预览容器 */
  &__file-image {
    width: 70px;
    height: 70px; /* 固定尺寸保持统一性 */
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #e8f5e9; /* 浅绿色边框 */

    img {
      width: 100%;
      height: 100%;
      object-fit: cover; /* 保持图片比例并填充容器 */
    }
  }

  /* 文件预览容器 */
  &__file-document {
    padding: 10px 14px;
    background-color: #f1f8e9; /* 更淡的绿色背景 */
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #c8e6c9; /* 浅绿色边框 */
  }

  /* 文件名称 */
  &__file-name {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis; /* 文本溢出显示省略号 */
    white-space: nowrap; /* 强制单行显示 */
    color: #2e7d32; /* 深绿色文字 */
    font-weight: 500;
  }

  /* 文件大小 */
  &__file-size {
    color: #66bb6a; /* 中等绿色 - 次要信息使用浅色 */
    font-size: 12px;
  }

  /* 删除按钮 */
  &__file-delete {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;

    img {
      width: 12px;
      height: 12px;
      opacity: 0.7;
    }

    &:hover {
      background-color: #ef5350; /* 红色背景 */
      transform: scale(1.1);

      img {
        opacity: 1;
        filter: brightness(2); /* 图标变白 */
      }
    }
  }

  /* 输入框包装器 */
  &__wrapper {
    margin-bottom: 12px;
    position: relative;
  }

  /* 输入框样式 */
  &__textarea {
    width: 100%;

    :deep(.el-textarea__inner) {
      min-height: 40px;
      max-height: 150px;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      transition: all 0.3s ease;
      font-size: 15px;
      line-height: 1.5;
      color: #333;
      resize: none;

      &:focus {
        border-color: #4caf50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
      }

      &::placeholder {
        color: #9e9e9e;
      }
    }

    /* 禁用状态 */
    &--disabled {
      :deep(.el-textarea__inner) {
        background-color: #f5f5f5;
        color: #9e9e9e;
        cursor: not-allowed;
      }
    }
  }

  /* 操作按钮容器 */
  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  /* 分隔线 */
  &__divider {
    height: 24px;
    width: 1px;
    background-color: #e0e0e0;
    margin: 0 4px;
  }

  /* 上传按钮容器 */
  &__upload {
    display: flex;
  }

  /* 按钮基础样式 */
  &__button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: #f1f8e9;
    border: 1px solid #c8e6c9;
    transition: all 0.2s ease;

    img {
      width: 18px;
      height: 18px;
      opacity: 0.8;
      transition: all 0.2s ease;
    }

    &:hover {
      background-color: #e8f5e9;
      transform: translateY(-2px);
      box-shadow: 0 3px 8px rgba(76, 175, 80, 0.2);

      img {
        opacity: 1;
      }
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 3px rgba(76, 175, 80, 0.1);
    }

    /* 发送按钮特殊样式 */
    &--send {
      background-color: #4caf50;
      border-color: #43a047;

      img {
        opacity: 1;
        filter: brightness(2); /* 图标变白 */
      }

      &:hover {
        background-color: #43a047;
        box-shadow: 0 3px 8px rgba(76, 175, 80, 0.3);
      }

      &:disabled {
        background-color: #c8e6c9;
        border-color: #c8e6c9;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;

        img {
          opacity: 0.6;
        }
      }
    }
  }
}
</style>
