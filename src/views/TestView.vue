<template>
  <div class="test-container">
    <h1>聊天服务测试</h1>

    <div class="input-area">
      <textarea
        v-model="userInput"
        placeholder="请输入消息..."
        @keydown.enter.prevent="sendMessage"
      ></textarea>
      <button @click="sendMessage" :disabled="loading">发送</button>
      <button
        v-if="loading"
        @click="stopGeneration"
        class="stop-btn"
      >
        停止生成
      </button>
    </div>

    <div class="message-area">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <div class="message-header">
          {{ message.role === 'user' ? '用户' : 'AI' }}
          <span v-if="message.loading" class="loading">思考中...</span>
          <span v-if="message.speed" class="speed">{{ message.speed }} tokens/s</span>
        </div>
        <div class="message-content">
          <div v-if="message.role === 'user'">{{ message.content }}</div>
          <template v-else>
            <div v-if="message.reasoning_content" class="reasoning">
              <div class="reasoning-header">思考过程：</div>
              <div class="reasoning-content typewriter" :class="{ 'is-typing': message.loading }">
                {{ message.reasoning_content }}
              </div>
            </div>
            <div class="response typewriter" :class="{ 'is-typing': message.loading }">
              {{ message.content || '...' }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 调试信息 -->
    <div class="debug-info" v-if="debugInfo">
      <pre>{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { chatService } from '@/services/chat/chatService'
import type { ChatMessage } from '@/types/api'
import { useSettingStore } from '@/stores/setting'

// 状态
const userInput = ref('')
const messages = ref<any[]>([])
const loading = ref(false)
const debugInfo = ref('')
const abortController = ref<AbortController | null>(null)

// 获取设置
const settingStore = useSettingStore()

// 停止生成
function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null

    // 更新调试信息
    debugInfo.value = `已中断生成。\n${debugInfo.value}`

    // 更新最后一条消息的状态
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.loading) {
      lastMessage.loading = false
      lastMessage.content += '\n[已中断生成]'
    }

    // 重置加载状态
    loading.value = false
  }
}

// 发送消息
async function sendMessage() {
  if (!userInput.value.trim() || loading.value) return

  // 创建新的中断控制器
  abortController.value = new AbortController()

  // 添加用户消息
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: userInput.value,
    reasoning_content: '',
    files: [],
    tool_calls: [],
    completion_tokens: 0,
    speed: 0,
    loading: false
  }
  messages.value.push(userMessage)

  // 准备AI回复
  const messageId = `msg_${Date.now()}`
  const aiMessage = {
    id: messageId,
    role: 'assistant',
    content: '',
    reasoning_content: '',
    files: [],
    tool_calls: [],
    completion_tokens: 0,
    speed: 0,
    loading: true
  }
  messages.value.push(aiMessage)

  // 清空输入框并设置加载状态
  const input = userInput.value
  userInput.value = ''
  loading.value = true

  // 更新调试信息
  debugInfo.value = `准备发送请求:
- Stream模式: ${settingStore.settings.stream}
- 消息ID: ${messageId}
- 模型: ${settingStore.settings.model}
- API Key: ${settingStore.settings.apiKey ? '已设置' : '未设置'}`

  try {
    // 准备API消息格式
    const apiMessages: ChatMessage[] = [
      { role: 'user', content: input }
    ]

    // 调用聊天服务
    const response = await chatService.createChatCompletion(
      apiMessages,
      {
        messageId,
        signal: abortController.value.signal,
        updateCallback: (content, reasoning, tokens, speed, toolCalls) => {
          // 更新调试信息
          debugInfo.value = `收到更新:
- 内容长度: ${content.length}
- 推理内容长度: ${reasoning?.length || 0}
- Tokens: ${tokens}
- 速度: ${speed}
- 工具调用: ${toolCalls?.length || 0}
- 响应类型: ${response instanceof Response ? 'Stream' : 'Normal'}`

          // 更新消息内容（打字机效果）
          const currentMessage = messages.value.find(m => m.id === messageId)
          if (currentMessage) {
            currentMessage.content = content
            currentMessage.reasoning_content = reasoning || ''
            currentMessage.completion_tokens = tokens
            currentMessage.speed = speed
            currentMessage.tool_calls = toolCalls
            // 只有在完成时才设置loading为false
            if (content && !currentMessage.error) {
              currentMessage.loading = false
            }
          }
        }
      }
    )

    // 更新调试信息
    debugInfo.value += '\n\n请求已发送，等待响应...'
  } catch (error) {
    // 检查是否是因为中断引起的错误
    if (abortController.value?.signal.aborted) {
      console.log('请求被用户中断')
    } else {
      console.error('聊天请求失败:', error)
      // 显示错误消息
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      const currentMessage = messages.value.find(m => m.id === messageId)
      if (currentMessage) {
        currentMessage.content = `请求失败: ${errorMessage}`
        currentMessage.error = true
        currentMessage.loading = false
      }
      // 更新调试信息
      debugInfo.value = `请求失败:\n${errorMessage}`
    }
  } finally {
    loading.value = false
    // 清空中断控制器
    abortController.value = null
  }
}

onMounted(() => {
  // 初始化欢迎消息
  const welcomeMessage = {
    id: Date.now(),
    role: 'assistant',
    content: '你好！我是AI助手，请输入消息开始聊天。',
    reasoning_content: '',
    files: [],
    tool_calls: [],
    completion_tokens: 0,
    speed: 0,
    loading: false
  }
  messages.value.push(welcomeMessage)

  // 显示初始设置
  debugInfo.value = `当前设置:
- 模型: ${settingStore.settings.model}
- Stream模式: ${settingStore.settings.stream}
- API Key: ${settingStore.settings.apiKey ? '已设置' : '未设置'}
- Max Tokens: ${settingStore.settings.maxTokens}
- Temperature: ${settingStore.settings.temperature}
- Top P: ${settingStore.settings.topP}
- Top K: ${settingStore.settings.topK}`
})
</script>

<style scoped>
.test-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.input-area {
  display: flex;
  margin-bottom: 20px;
}

textarea {
  flex: 1;
  height: 60px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
  font-size: 16px;
}

button {
  margin-left: 10px;
  padding: 0 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.message-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.message {
  padding: 10px;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
  background-color: #e3f2fd;
}

.message.assistant {
  align-self: flex-start;
  background-color: #f1f1f1;
}

.message-header {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading {
  color: #ff9800;
  font-size: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

.speed {
  color: #4caf50;
  font-size: 12px;
}

.message-content {
  font-size: 16px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.reasoning {
  margin-bottom: 10px;
  padding: 8px;
  background-color: #fff3e0;
  border-radius: 4px;
}

.reasoning-header {
  font-size: 14px;
  color: #ff9800;
  margin-bottom: 4px;
}

.reasoning-content {
  font-size: 14px;
  color: #666;
  font-style: italic;
}

.response {
  margin-top: 8px;
}

.typewriter {
  border-right: 2px solid transparent;
}

.typewriter.is-typing {
  border-right-color: #333;
  animation: blinking-cursor 1s step-end infinite;
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

@keyframes blinking-cursor {
  from, to { border-color: transparent; }
  50% { border-color: #333; }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.stop-btn {
  margin-left: 10px;
  padding: 0 20px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
</style>
