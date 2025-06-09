<template>
  <div class="chat-test-container">
    <h1>聊天测试界面</h1>

    <div class="chat-input-panel">
      <textarea
        v-model="userInput"
        placeholder="请输入你的问题..."
        :disabled="isLoading || isStreaming"
        @keydown.ctrl.enter="sendMessage"
      ></textarea>
      <div class="action-buttons">
        <button
          @click="sendMessage"
          :disabled="isLoading || isStreaming || !userInput.trim()"
          class="send-btn"
        >
          发送
        </button>
      </div>
    </div>

    <div class="controls-panel" v-if="isStreaming || isPaused">
      <div class="stream-controls">
        <button @click="pauseStream" :disabled="!isStreaming || isPaused">暂停</button>
        <button @click="resumeStream" :disabled="!isPaused">继续</button>
        <button @click="cancelStream" :disabled="!isStreaming && !isPaused">取消</button>
      </div>

      <div class="typewriter-controls">
        <div class="control-group">
          <label>打字速度 (ms):</label>
          <input type="number" v-model.number="typingSpeed" min="10" max="200" step="10" :disabled="isTyping">
        </div>
        <div class="control-group">
          <label>随机延迟范围 (ms):</label>
          <input type="number" v-model.number="randomDelayRange" min="0" max="100" step="10" :disabled="isTyping">
        </div>
      </div>
    </div>

    <div class="debug-panel">
      <h3>调试信息</h3>
      <div class="debug-info">
        <p>isStreaming: {{ isStreaming }}</p>
        <p>isPaused: {{ isPaused }}</p>
        <p>isTyping: {{ isTyping }}</p>
        <p>isPausedTyping: {{ isPausedTyping }}</p>
        <p>原始内容长度: {{ streamContent.length }}</p>
        <p>显示内容长度: {{ displayContent.length }}</p>
        <p>队列长度: {{ contentQueue.length }}</p>
        <p>MessageID: {{ lastMessageId }}</p>
      </div>
    </div>

    <div class="chat-content">
      <div class="message user" v-if="currentQuestion">
        <div class="message-header">
          <span class="role">用户</span>
        </div>
        <div class="message-content">{{ currentQuestion }}</div>
      </div>

      <div class="message assistant" v-if="streamContent || displayContent">
        <div class="message-header">
          <span class="role">助手</span>
          <div class="message-status" v-if="isStreaming || isPaused">
            <span v-if="isStreaming && !isPaused">正在回答...</span>
            <span v-if="isPaused">已暂停</span>
          </div>
        </div>
        <div class="message-content typing">
          <span class="typed-text">{{ displayContent }}</span>
          <span class="cursor" :class="{ 'blink': isTyping && !isPausedTyping }">|</span>
        </div>
        <div class="message-meta">
          <span>Token数: {{ completionTokens }}</span>
          <span>速度: {{ speed }} tokens/s</span>
          <span v-if="contentQueue.length > 0">队列中待显示: {{ contentQueue.length }} 段</span>
        </div>
      </div>

      <div v-if="error" class="error-message">
        <h3>错误信息:</h3>
        <pre>{{ error }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { chatService } from '@/services/chat/chatService'
import { useConversationControl } from '@/composables/useConversationControl'
import { useStreamControl } from '@/composables/useStreamControl'
import type { UpdateCallback, ToolCall } from '@/types/api'

// 输入状态
const userInput = ref('')
const currentQuestion = ref('')
const isLoading = ref(false)
const error = ref('')

// 流数据和打字机效果
const streamContent = ref('')
const displayContent = ref('') // 用于显示打字机效果的内容
const reasoningContent = ref('')
const completionTokens = ref(0)
const speed = ref('0')
const isStreaming = ref(false)
const isPaused = ref(false)

// 打字机效果状态
const isTyping = ref(false)
const isPausedTyping = ref(false)
const typingSpeed = ref(50)
const randomDelayRange = ref(30)
let typewriterTimeout: number | null = null
let contentQueue: string[] = [] // 用于存储待显示的内容
let isProcessingQueue = false

// 会话状态
const conversationId = ref('')
const lastMessageId = ref('')

// 实例化hooks
const conversationControl = useConversationControl()
let streamControl: ReturnType<typeof useStreamControl> | null = null
let autoSaveIntervalId: number | null = null

// 打字机效果实现
const typeText = async (text: string, startIndex = 0) => {
  if (!text || text.length === 0) {
    console.log('没有内容可以显示')
    return
  }

  if (!isTyping.value || isPausedTyping.value) {
    console.log('打字机已暂停或停止')
    return
  }

  if (startIndex < text.length) {
    displayContent.value = text.slice(0, startIndex + 1)

    const baseDelay = typingSpeed.value
    const randomDelay = Math.random() * randomDelayRange.value
    const totalDelay = baseDelay + randomDelay

    const currentChar = text[startIndex]
    const extraDelay = /[,.!?，。！？]/.test(currentChar) ? 300 : 0

    if (startIndex % 20 === 0) {
      console.log(`打字中... 索引: ${startIndex}/${text.length}, 延迟: ${totalDelay + extraDelay}ms`)
    }

    typewriterTimeout = window.setTimeout(
      () => typeText(text, startIndex + 1),
      totalDelay + extraDelay
    )
  } else {
    console.log('文本打字完成')
    // 当前文本显示完成，检查队列中是否还有内容
    if (contentQueue.length > 0) {
      const nextContent = contentQueue.shift()
      if (nextContent) {
        console.log(`开始处理队列中的下一段内容，长度: ${nextContent.length}`)
        typeText(nextContent)
      }
    } else {
      isProcessingQueue = false
      // 如果流已经停止，可以重置打字机状态
      if (!isStreaming.value && !isPaused.value) {
        isTyping.value = false
      }
    }
  }
}

// 更新回调
const updateCallback: UpdateCallback = (
  content: string,
  reasoning: string,
  tokens: number,
  generationSpeed: string,
  toolCalls?: ToolCall[]
) => {
  // 更新原始内容
  streamContent.value = content

  // 处理打字机效果
  if (!isTyping.value) {
    // 第一次收到内容，启动打字机效果
    isTyping.value = true
    displayContent.value = ''
    typeText(content)
  } else {
    // 将新内容添加到队列
    const newContent = content.slice(streamContent.value.length)
    if (newContent) {
      contentQueue.push(newContent)
      if (!isProcessingQueue && !isPausedTyping.value) {
        isProcessingQueue = true
        const nextContent = contentQueue.shift()
        if (nextContent) {
          typeText(nextContent)
        }
      }
    }
  }

  // 更新其他状态
  reasoningContent.value = reasoning || ''
  completionTokens.value = tokens || 0
  speed.value = generationSpeed || '0'
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value || isStreaming.value) return

  try {
    // 重置状态
    isLoading.value = true
    error.value = ''
    streamContent.value = ''
    displayContent.value = ''
    reasoningContent.value = ''
    completionTokens.value = 0
    speed.value = '0'
    contentQueue = []
    isProcessingQueue = false
    isTyping.value = false
    isPausedTyping.value = false

    // 保存当前问题
    currentQuestion.value = userInput.value

    // 创建会话（如果不存在）
    if (!conversationId.value) {
      conversationId.value = conversationControl.createConversation('测试会话')
    }

    // 初始化状态
    isStreaming.value = true

    // 发送消息 - 使用chatService直接发送以确保流处理正确
    const testMessageId = `test_${Date.now()}`
    lastMessageId.value = testMessageId

    console.log('开始发送消息:', currentQuestion.value)

    // 初始化流控制
    streamControl = useStreamControl(testMessageId)

    // 设置自动保存
    if (streamControl) {
      autoSaveIntervalId = streamControl.setupAutoSave()
    }

    // 直接使用chatService
    await chatService.createChatCompletion(
      [{ role: 'user', content: currentQuestion.value }],
      {
        messageId: testMessageId,
        updateCallback: (content, reasoning, tokens, generationSpeed, toolCalls) => {
          console.log('收到内容更新:', {
            contentLength: content.length,
            hasReasoning: !!reasoning,
            tokens,
            speed: generationSpeed
          })

          // 更新原始内容
          streamContent.value = content

          // 处理打字机效果
          if (!isTyping.value) {
            console.log('启动打字机效果')
            // 第一次收到内容，启动打字机效果
            isTyping.value = true
            displayContent.value = ''
            typeText(content)
          } else {
            // 将新内容添加到队列
            const newContent = content.slice(streamContent.value.length)
            if (newContent) {
              console.log(`添加新内容到队列: ${newContent.length}字符`)
              contentQueue.push(newContent)
              if (!isProcessingQueue && !isPausedTyping.value) {
                isProcessingQueue = true
                const nextContent = contentQueue.shift()
                if (nextContent) {
                  typeText(nextContent)
                }
              }
            }
          }

          // 更新其他状态
          reasoningContent.value = reasoning || ''
          completionTokens.value = tokens || 0
          speed.value = generationSpeed || '0'

          // 更新流控制
          if (streamControl) {
            isStreaming.value = streamControl.isStreaming.value
            isPaused.value = streamControl.isPaused.value
          }
        }
      }
    )

    // 清空输入框
    userInput.value = ''

  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    isStreaming.value = false
    console.error('消息发送错误:', err)
  } finally {
    isLoading.value = false
  }
}

// 暂停流
const pauseStream = () => {
  console.log('尝试暂停流')
  if (streamControl && !isPaused.value) {
    console.log('执行暂停操作')
    isPaused.value = true
    isPausedTyping.value = true

    // 暂停流并获取当前的 AbortController
    const currentController = streamControl.pause()

    // 如果需要中止当前请求，可以在这里处理
    if (currentController) {
      currentController.abort('Stream paused by user')
    }
  }
}

// 恢复流
const resumeStream = async () => {
  console.log('尝试恢复流')
  if (streamControl && isPaused.value) {
    console.log('执行恢复操作')
    isPaused.value = false
    isPausedTyping.value = false

    try {
      await streamControl.resume(updateCallback)
    } catch (err) {
      console.error('恢复流失败:', err)
      error.value = err instanceof Error ? err.message : '恢复流失败'
    }
  }
}

// 取消流
const cancelStream = () => {
  console.log('尝试取消流')
  if (streamControl) {
    console.log('执行取消操作')
    streamControl.cancel()
    isStreaming.value = false
    isPaused.value = false
    isPausedTyping.value = false
    isTyping.value = false
  }
}

// 暂停打字效果
const pauseTypewriter = () => {
  isPausedTyping.value = true
  if (typewriterTimeout) {
    clearTimeout(typewriterTimeout)
    typewriterTimeout = null
  }
}

// 继续打字效果
const resumeTypewriter = () => {
  if (!isTyping.value) return
  isPausedTyping.value = false
  if (contentQueue.length > 0) {
    const nextContent = contentQueue.shift()
    if (nextContent) {
      typeText(nextContent)
    }
  } else {
    typeText(streamContent.value, displayContent.value.length)
  }
}

// 停止打字效果
const stopTypewriter = () => {
  isTyping.value = false
  isPausedTyping.value = false
  if (typewriterTimeout) {
    clearTimeout(typewriterTimeout)
    typewriterTimeout = null
  }
  contentQueue = []
  isProcessingQueue = false
  displayContent.value = streamContent.value
}

// 在组件卸载时清理资源
onUnmounted(() => {
  if (typewriterTimeout) {
    clearTimeout(typewriterTimeout)
  }

  // 清理自动保存定时器
  if (streamControl && autoSaveIntervalId) {
    streamControl.cleanupAutoSave(autoSaveIntervalId)
  }
})
</script>

<style scoped>
.chat-test-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
}

.chat-input-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: 16px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.send-btn {
  background-color: #4caf50;
  color: white;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.controls-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f0f7ff;
  border-radius: 8px;
}

.stream-controls {
  display: flex;
  gap: 10px;
}

.stream-controls button {
  background-color: #2196f3;
  color: white;
}

.typewriter-controls {
  display: flex;
  gap: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-size: 14px;
  color: #666;
}

.control-group input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.chat-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message {
  display: flex;
  flex-direction: column;
  padding: 15px;
  border-radius: 8px;
  max-width: 90%;
}

.message.user {
  align-self: flex-end;
  background-color: #e3f2fd;
}

.message.assistant {
  align-self: flex-start;
  background-color: #f1f8e9;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: bold;
}

.message-status {
  font-size: 14px;
  color: #666;
  font-style: italic;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.message-content.typing {
  font-family: 'Courier New', Courier, monospace;
}

.message-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 18px;
  background-color: #333;
  margin-left: 2px;
  animation: none;
}

.cursor.blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  from, to {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.error-message {
  padding: 15px;
  background-color: #ffebee;
  border-radius: 8px;
  margin-top: 20px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
}

.debug-panel {
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.debug-info {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 14px;
  color: #666;
}
</style>
