import { computed, ref, onMounted } from 'vue'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { useStreamStore } from '@/stores/stream'
import { chatService } from '@/services/chat/chatService'
import { useStreamControl } from './useStreamControl'
import type { Message } from '@/types/chat'
import type { ChatMessage, UpdateCallback } from '@/types/api'

// 存储键前缀
const STORAGE_KEY = {
  LAST_ASSISTANT_MESSAGE: 'last_assistant_message',
  MESSAGE_HISTORY: 'message_history_'
}

export interface ConversationControl {
  // 会话状态
  currentMessages: Message[];
  rootMessages: Message[];
  isGenerating: boolean;
  lastAssistantMessageId: string | null;

  // 会话操作
  createConversation: (title: string) => string;
  switchConversation: (id: string) => boolean;
  deleteConversation: (id: string) => boolean;

  // 消息操作
  sendMessage: (content: string, parentId?: string) => Promise<string>;
  resendMessage: (messageId: string) => Promise<void>;
  getMessageTree: (messageId: string) => Message | null;

  // 消息恢复
  restoreLastAssistantMessage: () => boolean;
  saveLastAssistantMessageId: (messageId: string) => void;
}

export function useConversationControl() {
  const chatStore = useNormalizedChatStore()
  const streamStore = useStreamStore()

  // 本地状态
  const isGenerating = ref(false)
  const lastAssistantMessageId = ref<string | null>(null)

  // 计算属性：当前会话的消息
  const currentMessages = computed(() => chatStore.currentConversationAllMessages)
  const rootMessages = computed(() => chatStore.currentConversationRootMessages)

  // 创建新会话
  const createConversation = (title: string) => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return chatStore.addConversation({ id, title })
  }

  // 切换会话
  const switchConversation = (id: string) => {
    const result = chatStore.switchConversation(id)
    if (result) {
      // 切换会话后尝试恢复最后一条助手消息
      restoreLastAssistantMessage()
    }
    return result
  }

  // 删除会话
  const deleteConversation = (id: string) => {
    // 如果删除的是当前会话，清除最后一条助手消息ID
    if (id === chatStore.currentConversationId) {
      localStorage.removeItem(STORAGE_KEY.LAST_ASSISTANT_MESSAGE)
      lastAssistantMessageId.value = null
    }
    return chatStore.deleteConversation(id)
  }

  // 保存最后一条助手消息ID
  const saveLastAssistantMessageId = (messageId: string) => {
    if (!chatStore.currentConversationId) return

    localStorage.setItem(STORAGE_KEY.LAST_ASSISTANT_MESSAGE, JSON.stringify({
      conversationId: chatStore.currentConversationId,
      messageId: messageId,
      timestamp: Date.now()
    }))

    lastAssistantMessageId.value = messageId
  }

  // 恢复最后一条助手消息
  const restoreLastAssistantMessage = (): boolean => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY.LAST_ASSISTANT_MESSAGE)
      if (!savedData) return false

      const { conversationId, messageId, timestamp } = JSON.parse(savedData)

      // 检查是否是当前会话
      if (conversationId !== chatStore.currentConversationId) return false

      // 检查消息是否存在
      const message = chatStore.messages.get(messageId)
      if (!message) return false

      // 设置最后一条助手消息ID
      lastAssistantMessageId.value = messageId

      // 使用 useStreamControl 恢复流状态
      const streamControl = useStreamControl(messageId)
      const restored = streamControl.restoreStreamState()

      // 如果流是未完成状态，设置生成中状态
      if (restored && streamControl.isIncomplete.value) {
        isGenerating.value = true
        // 创建新的流状态（如果不存在）
        if (!streamStore.streams.get(`stream_${messageId}`)) {
          streamStore.startStream(messageId)
          // 如果是暂停状态，设置为暂停
          if (streamControl.isPaused.value) {
            streamStore.pauseStream(messageId)
          }
        }
      }

      return restored
    } catch (error) {
      console.error('Failed to restore last assistant message:', error)
      return false
    }
  }

  // 发送新消息
  const sendMessage = async (content: string, parentId?: string): Promise<string> => {
    if (!chatStore.currentConversationId) {
      throw new Error('No active conversation')
    }

    try {
      isGenerating.value = true

      // 1. 创建用户消息
      const userMessageId = chatStore.addMessage({
        conversationId: chatStore.currentConversationId,
        parentId: parentId || null,
        role: 'user',
        content
      })

      // 2. 创建助手消息（预创建，等待响应）
      const assistantMessageId = chatStore.addMessage({
        conversationId: chatStore.currentConversationId,
        parentId: userMessageId,
        role: 'assistant',
        content: ''
      })

      // 3. 保存最后一条助手消息ID
      saveLastAssistantMessageId(assistantMessageId)

      // 4. 准备消息历史
      const messageHistory = buildMessageHistory(userMessageId)

      // 5. 定义更新回调
      const updateCallback: UpdateCallback = (
        content,
        reasoning_content,
        completion_tokens,
        speed,
        tool_calls
      ) => {
        chatStore.updateMessage(assistantMessageId, {
          content,
          reasoning_content,
          completion_tokens: Number(completion_tokens),
          speed: Number(speed)
        })
      }

      // 6. 获取流控制器
      const streamControl = useStreamControl(assistantMessageId)

      // 7. 发送请求
      await chatService.createChatCompletion(
        messageHistory,
        {
          messageId: assistantMessageId,
          updateCallback
        }
      )

      // 8. 完成后清理
      streamControl.clearStreamState() // 可选：清除流状态

      return assistantMessageId
    } catch (error) {
      console.error('Failed to send message:', error)
      // 错误已经由chatService处理，这里不需要额外处理
      return ''
    } finally {
      isGenerating.value = false
    }
  }

  // 重新发送消息
  const resendMessage = async (messageId: string) => {
    const message = chatStore.messages.get(messageId)
    if (!message || message.role !== 'user') return

    await sendMessage(message.content, message.parentId || undefined)
  }

  // 获取消息树
  const getMessageTree = (messageId: string) => {
    return chatStore.getMessageTree(messageId)
  }

  // 构建消息历史（私有方法）
  const buildMessageHistory = (latestMessageId: string): ChatMessage[] => {
    const history: ChatMessage[] = []
    let currentId: string | null = latestMessageId

    while (currentId) {
      const message = chatStore.messages.get(currentId)
      if (!message) break

      history.unshift({
        role: message.role as "user" | "assistant" | "system",
        content: message.content,
        reasoning_content: message.reasoning_content
      })

      currentId = message.parentId
    }

    // 保存消息历史到本地存储，便于刷新后恢复
    try {
      localStorage.setItem(
        `${STORAGE_KEY.MESSAGE_HISTORY}${latestMessageId}`,
        JSON.stringify(history)
      )
    } catch (error) {
      console.error('Failed to save message history:', error)
    }

    return history
  }

  // 初始化：尝试恢复最后一条助手消息
  onMounted(() => {
    if (chatStore.currentConversationId) {
      restoreLastAssistantMessage()
    }
  })

  return {
    // 状态
    currentMessages,
    rootMessages,
    isGenerating,
    lastAssistantMessageId: lastAssistantMessageId.value,

    // 会话操作
    createConversation,
    switchConversation,
    deleteConversation,

    // 消息操作
    sendMessage,
    resendMessage,
    getMessageTree,

    // 消息恢复
    restoreLastAssistantMessage,
    saveLastAssistantMessageId
  }
}
