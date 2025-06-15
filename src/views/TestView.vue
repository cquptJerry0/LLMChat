<template>
  <div class="chat-demo">
    <h2>Chat Demo</h2>

    <!-- 会话控制 -->
    <div class="conversation-controls">
      <h3>会话控制</h3>
      <div class="control-group">
        <input v-model="newConversationTitle" placeholder="新会话标题" />
        <button @click="createConversation">创建会话</button>
      </div>

      <div class="conversations-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === currentConversationId }"
          @click="switchConversation(conversation.id)"
        >
          <span>{{ conversation.title }}</span>
          <button @click.stop="deleteConversation(conversation.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container">
      <h3>消息</h3>
      <div class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="message.role"
        >
          <div class="message-header">
            <strong>{{ message.role === 'user' ? '用户' : '助手' }}</strong>
            <div class="message-actions">
              <button v-if="message.role === 'user'" @click="resendMessage(message.id)">重发</button>
              <button v-if="message.role === 'assistant'" @click="copyMessage(message.id)">复制</button>
            </div>
          </div>
          <div class="message-content">{{ message.content }}</div>
          <div v-if="message.reasoning_content" class="message-reasoning">
            <details>
              <summary>推理过程</summary>
              <div>{{ message.reasoning_content }}</div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <!-- 流控制 -->
    <div class="stream-controls">
      <h3>流控制</h3>
      <div class="status-info">
        <div>状态: <strong>{{ streamState.status }}</strong></div>
        <div>令牌数: {{ streamState.completion_tokens }}</div>
        <div>速度: {{ streamState.speed }} tokens/s</div>
        <div v-if="streamState.buffer.hasBufferedContent" class="buffer-info">
          缓冲区有内容
        </div>
      </div>

      <div class="control-buttons">
        <button
          @click="pauseStream"
          :disabled="!streamState.isStreaming"
        >暂停</button>
        <button
          @click="resumeStream"
          :disabled="!streamState.isPaused"
        >继续</button>
        <button
          @click="abortStream"
          :disabled="!streamState.isStreaming && !streamState.isPaused"
        >中止</button>
        <button
          @click="createCheckpoint"
          :disabled="streamState.isCompleted"
        >创建检查点</button>
        <button
          @click="restoreCheckpoint"
          :disabled="streamState.isStreaming"
        >恢复检查点</button>
      </div>
    </div>

    <!-- 发送消息 -->
    <div class="send-message">
      <textarea
        v-model="newMessage"
        placeholder="输入消息..."
        :disabled="isGenerating"
        @keydown.ctrl.enter="sendMessage"
      ></textarea>
      <button
        @click="sendMessage"
        :disabled="isGenerating || !newMessage.trim()"
      >
        {{ isGenerating ? '生成中...' : '发送' }}
      </button>
    </div>

    <!-- 事件日志 -->
    <div class="event-log">
      <h3>事件日志</h3>
      <div class="log-entries">
        <div v-for="(entry, index) in eventLog" :key="index" class="log-entry">
          <span class="log-time">{{ entry.time }}</span>
          <span class="log-type" :class="entry.type">{{ entry.type }}</span>
          <span class="log-message">{{ entry.message }}</span>
        </div>
      </div>
      <button @click="clearLog">清除日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNewConversationControl } from '@/composables/useNewConversationControl'
import { useNewStreamControl } from '@/composables/useNewStreamControl'
import { ConversationEvent } from '@/types/newConversationControl'
import { StreamEvent } from '@/types/newStreamControl'
import type { StreamControlContext } from '@/types/newStreamControl'

// 创建流控制器
const streamControl = useNewStreamControl({
  checkpointInterval: 5000,
  clearOnUnmount: false
})

// 创建流控制上下文（简化版，实际应该导入）
function createContext(controller: any): StreamControlContext {
  return {
    state: controller.state,
    controls: {
      pause: controller.pauseStream,
      resume: async (updateCallback?: any) => {
        const result = controller.resumeStream()
        if (result && updateCallback) {
          const { resumeInfo } = result
          updateCallback(
            resumeInfo.lastContent,
            resumeInfo.lastReasoning,
            resumeInfo.lastTokens,
            '0'
          )
        }
        // 返回 void 而不是 boolean
      },
      abort: controller.abortStream,
      createCheckpoint: controller.createCheckpoint,
      restoreFromCheckpoint: controller.restoreFromCheckpoint,
      updateMessageId: controller.setMessageId
    }
  }
}

// 创建会话控制器，并传入流控制器
const conversationControl = useNewConversationControl({
  streamControl: createContext(streamControl),
  clearOnUnmount: false
})

// 状态
const newConversationTitle = ref('新会话')
const newMessage = ref('')
const eventLog = ref<Array<{time: string, type: string, message: string}>>([])

// 计算属性
const conversations = computed(() => {
  return Array.from(conversationControl.state.value.currentMessages)
    .filter(msg => msg.parentId === null)
    .map(msg => ({
      id: msg.conversationId,
      title: msg.content.substring(0, 20) + (msg.content.length > 20 ? '...' : '')
    }))
})

const currentConversationId = computed(() => conversationControl.state.value.currentConversationId)
const messages = computed(() => conversationControl.state.value.currentMessages)
const isGenerating = computed(() => conversationControl.state.value.isGenerating)
const streamState = computed(() => streamControl.state.value)

// 方法
function createConversation() {
  const id = conversationControl.conversationActions.create(newConversationTitle.value)
  conversationControl.conversationActions.switch(id)
  newConversationTitle.value = '新会话'
}

function switchConversation(id: string) {
  conversationControl.conversationActions.switch(id)
}

function deleteConversation(id: string) {
  conversationControl.conversationActions.delete(id)
}

function sendMessage() {
  if (!newMessage.value.trim() || isGenerating.value) return

  conversationControl.messageActions.send(newMessage.value)
  newMessage.value = ''
}

function resendMessage(messageId: string) {
  conversationControl.messageActions.resend(messageId)
}

function copyMessage(messageId: string) {
  conversationControl.messageActions.copyMessage(messageId)
}

function pauseStream() {
  console.log('[UI层] 暂停按钮被点击')
  addLogEntry('ui', '暂停按钮被点击')
  streamControl.pauseStream()
}

function resumeStream() {
  console.log('[UI层] 继续按钮被点击')
  addLogEntry('ui', '继续按钮被点击')
  streamControl.resumeStream()
}

function abortStream() {
  console.log('[UI层] 中止按钮被点击')
  addLogEntry('ui', '中止按钮被点击')
  streamControl.abortStream()
}

function createCheckpoint() {
  streamControl.createCheckpoint()
}

function restoreCheckpoint() {
  streamControl.restoreFromCheckpoint()
}

function addLogEntry(type: string, message: string) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  eventLog.value.unshift({
    time,
    type,
    message
  })

  // 限制日志条目数量
  if (eventLog.value.length > 100) {
    eventLog.value = eventLog.value.slice(0, 100)
  }
}

function clearLog() {
  eventLog.value = []
}

// 注册事件监听器
onMounted(() => {
  // 会话事件
  conversationControl.on(ConversationEvent.CREATED, (payload: any) => {
    addLogEntry('conversation', `会话已创建: ${payload.title}`)
  })

  conversationControl.on(ConversationEvent.SWITCHED, (payload: any) => {
    addLogEntry('conversation', `已切换会话: ${payload.id}`)
  })

  conversationControl.on(ConversationEvent.MESSAGE_ADDED, (payload: any) => {
    addLogEntry('message', `新消息 (${payload.role}): ${payload.content.substring(0, 20)}...`)
  })

  conversationControl.on(ConversationEvent.GENERATION_STARTED, () => {
    addLogEntry('generation', '开始生成回复')
  })

  conversationControl.on(ConversationEvent.GENERATION_COMPLETED, (payload: any) => {
    addLogEntry('generation', `回复生成完成: ${payload.messageId}`)
  })

  // 流事件
  streamControl.on(StreamEvent.START, (payload: any) => {
    addLogEntry('stream', `流开始: ${payload.messageId}`)
  })

  streamControl.on(StreamEvent.PAUSE, (payload: any) => {
    addLogEntry('stream', `流已暂停: ${payload.messageId}`)
  })

  streamControl.on(StreamEvent.RESUME, (payload: any) => {
    addLogEntry('stream', `流已恢复: ${payload.messageId}`)
  })

  streamControl.on(StreamEvent.COMPLETE, (payload: any) => {
    addLogEntry('stream', `流已完成: ${payload.messageId}`)
  })

  streamControl.on(StreamEvent.ERROR, (payload: any) => {
    addLogEntry('error', `流错误: ${payload.error}`)
  })

  streamControl.on(StreamEvent.CHECKPOINT, (payload: any) => {
    addLogEntry('checkpoint', `创建检查点: ${payload.checkpointId}`)
  })

  // 创建初始会话（如果没有）
  if (!currentConversationId.value) {
    createConversation()
  }
})
</script>

<style scoped>
.chat-demo {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto auto;
  gap: 16px;
  height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}

h2 {
  grid-column: span 2;
  margin: 0 0 16px 0;
}

.conversation-controls {
  grid-row: span 2;
}

.control-group {
  display: flex;
  margin-bottom: 16px;
}

.control-group input {
  flex: 1;
  padding: 8px;
  margin-right: 8px;
}

.conversations-list {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.conversation-item {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.active {
  background-color: #e0f0ff;
}

.messages-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  overflow-y: auto;
  max-height: 400px;
}

.message-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
}

.message-item.user {
  background-color: #e0f0ff;
  margin-left: 20%;
}

.message-item.assistant {
  background-color: #f0f0f0;
  margin-right: 20%;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.message-content {
  white-space: pre-wrap;
}

.message-reasoning {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #ccc;
}

.stream-controls {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  grid-column: span 2;
}

.status-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.buffer-info {
  color: #ff6600;
  font-weight: bold;
}

.send-message {
  grid-column: span 2;
  display: flex;
  gap: 8px;
}

.send-message textarea {
  flex: 1;
  height: 80px;
  padding: 8px;
  resize: vertical;
}

.event-log {
  grid-column: span 2;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.log-entries {
  margin-bottom: 8px;
}

.log-entry {
  font-family: monospace;
  margin-bottom: 4px;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-type {
  display: inline-block;
  width: 100px;
  margin-right: 8px;
  font-weight: bold;
}

.log-type.conversation {
  color: #0066cc;
}

.log-type.message {
  color: #009900;
}

.log-type.generation {
  color: #9900cc;
}

.log-type.stream {
  color: #cc6600;
}

.log-type.checkpoint {
  color: #0099cc;
}

.log-type.error {
  color: #cc0000;
}

button {
  padding: 8px 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
